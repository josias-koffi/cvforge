import { looksConfirmed, submitRefusal } from "../domain/submission";
import type { ApplicationSummary } from "../domain/offer";
import type { FormSnapshot } from "../page/form-state";
import type { ActiveTab, PageReader } from "./preparation";
import type { JobSparkTools } from "./session";
import { validatedAnswers, type DraftedAnswer } from "../domain/open-answer";

/** The form in the recruiter's tab, outside page-agent. */
export interface FormTab {
  read(tabId: number): Promise<FormSnapshot>;
  submit(
    tabId: number,
  ): Promise<
    { clicked: true; label: string } | { clicked: false; reason: string }
  >;
  /** What the tab shows now (it may have moved to a confirmation page). */
  observe(tabId: number): Promise<{ url: string; text: string }>;
  /** A JPEG of the visible tab, small enough for the MCP body limit. */
  capture(): Promise<{ base64: string; type: "image/jpeg" } | null>;
}

/** What the last fill left in a tab: which application, which documents. */
export type LastFill = {
  tabId: number;
  applicationId: string;
  documents: string[];
  /** Open answers the extension drafted (US-208), kept once sent. */
  drafted: DraftedAnswer[];
};

export type Review =
  | { kind: "nothing" }
  | {
      kind: "review";
      url: string;
      application: {
        id: string;
        title: string | null;
        company: string | null;
        offerUrl: string | null;
      };
      documents: string[];
      fields: FormSnapshot["fields"];
      requiredEmpty: string[];
      submitLabel: string | null;
      /** Why « Valider et envoyer » stays off, or null. */
      refusal: string | null;
      /** A captcha waits for the candidate in the page. */
      captcha: boolean;
      /** Open answers drafted by the extension, to read before sending. */
      drafted: DraftedAnswer[];
    };

export type SendOutcome = {
  confirmed: boolean;
  confirmationUrl: string | null;
  recorded: boolean;
};

const WAIT_STEPS = 20;
const WAIT_STEP_MS = 1_000;

/**
 * Level 1 of ADR-034 §6 (US-198): the candidate reviews what was filled and
 * presses « Valider et envoyer »; only then does the extension click the
 * final button, watch for the confirmation and record the proof.
 */
export class Sending {
  constructor(
    private readonly deps: {
      tools: JobSparkTools;
      pages: PageReader;
      form: FormTab;
      lastFill: (tabId: number) => LastFill | null;
      sleep?: (ms: number) => Promise<void>;
    },
  ) {}

  async review(): Promise<Review> {
    const tab = await this.deps.pages.activeTab();
    if (!tab || tab === "no-access") return { kind: "nothing" };
    return this.reviewTab(tab);
  }

  /** The review of the form filled in `tab`, even a background one (US-204). */
  async reviewTab(tab: ActiveTab): Promise<Review> {
    const fill = this.deps.lastFill(tab.tabId);
    if (!fill) return { kind: "nothing" };

    const [application, form] = await Promise.all([
      this.application(fill.applicationId),
      this.deps.form.read(tab.tabId),
    ]);
    return {
      application: {
        company: application.company,
        id: application.id,
        offerUrl: application.offerUrl,
        title: application.title,
      },
      captcha: form.captcha,
      documents: fill.documents,
      // As the form holds them now: the candidate may have corrected them.
      drafted: fill.drafted.map(
        (draft) => validatedAnswers([draft], form.fields)[0] ?? draft,
      ),
      fields: form.fields,
      kind: "review",
      refusal: this.refusal(tab.url, application, form),
      requiredEmpty: form.requiredEmpty,
      submitLabel: form.submitLabel,
      url: tab.url,
    };
  }

  /** « Valider et envoyer »: everything is checked again right before the click. */
  async send(request: {
    applicationId: string;
    url: string;
  }): Promise<SendOutcome> {
    const tab = await this.deps.pages.activeTab();
    if (!tab || tab === "no-access" || tab.url !== request.url) {
      throw new Error("L'onglet a changé : vérifiez à nouveau.");
    }
    const fill = this.deps.lastFill(tab.tabId);
    if (!fill || fill.applicationId !== request.applicationId) {
      throw new Error(
        "Remplissez d'abord ce formulaire avec cette candidature.",
      );
    }
    const application = await this.application(request.applicationId);
    const form = await this.deps.form.read(tab.tabId);
    const refusal = this.refusal(tab.url, application, form);
    if (refusal) throw new Error(refusal);

    const before = await this.deps.form.observe(tab.tabId);
    const click = await this.deps.form.submit(tab.tabId);
    if (!click.clicked) throw new Error(click.reason);

    const page = await this.waitForConfirmation(tab.tabId, before);
    const screenshot = await this.deps.form.capture().catch(() => null);
    await this.deps.tools.call("record_submission", {
      applicationId: application.id,
      confirmationUrl: page.confirmed ? page.url : null,
      confirmed: page.confirmed,
      documents: fill.documents,
      fields: form.fields,
      formUrl: tab.url,
      screenshotBase64: screenshot?.base64 ?? null,
      screenshotType: screenshot?.type ?? null,
    });
    await this.keepAnswers(fill.drafted, form.fields);
    return {
      confirmationUrl: page.confirmed ? page.url : null,
      confirmed: page.confirmed,
      recorded: true,
    };
  }

  /**
   * The drafted answers, as sent (corrections included), saved for similar
   * questions (US-208). Not fatal: the application is already sent.
   */
  private async keepAnswers(
    drafted: DraftedAnswer[],
    fields: FormSnapshot["fields"],
  ) {
    for (const entry of validatedAnswers(drafted, fields)) {
      await this.deps.tools
        .call("save_screening_answer", entry)
        .catch(() => undefined);
    }
  }

  private refusal(
    pageUrl: string,
    application: ApplicationSummary,
    form: FormSnapshot,
  ) {
    const rule = submitRefusal({
      offerUrl: application.offerUrl,
      pageUrl,
      requiredEmpty: form.requiredEmpty,
      status: application.status,
    });
    if (rule) return rule;
    if (form.multiStep) {
      return "Ce formulaire a plusieurs étapes : passez à la suivante vous-même, puis relancez le remplissage.";
    }
    if (!form.submitLabel)
      return "Bouton d'envoi introuvable ou ambigu : envoyez la candidature vous-même.";
    return null;
  }

  private async application(id: string) {
    const listed = (await this.deps.tools.call(
      "list_applications",
    )) as ApplicationSummary[];
    const application = listed.find((entry) => entry.id === id);
    if (!application) throw new Error("Candidature introuvable.");
    return application;
  }

  private async waitForConfirmation(
    tabId: number,
    before: { url: string; text: string },
  ) {
    const sleep =
      this.deps.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    let last = before;
    for (let step = 0; step < WAIT_STEPS; step++) {
      await sleep(WAIT_STEP_MS);
      // The page may be navigating: a failed look just waits for the next.
      last = await this.deps.form.observe(tabId).catch(() => last);
      if (looksConfirmed(last, before)) return { ...last, confirmed: true };
    }
    return { ...last, confirmed: false };
  }
}
