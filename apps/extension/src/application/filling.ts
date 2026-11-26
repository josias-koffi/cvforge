import {
  buildFillTask,
  sameQuestion,
  type FillAnswers,
  type FillProfile,
} from "../domain/fill";
import { readBalance } from "../domain/connection";
import { findApplicationFor, type ApplicationSummary } from "../domain/offer";
import {
  AI_CREDIT_ACTION_FORM_FILL,
  AI_CREDIT_COSTS,
  screeningQuestionKey,
} from "@cvforge/types";
import type {
  FillerReply,
  FillerRequest,
  FillerRun,
  PageProbe,
} from "../filler-messages";
import type { DocumentKind } from "../page/attach";
import type { PageReader } from "./preparation";
import type { LastFill } from "./sending";
import type { AiKeySettings, AiKeyStore, JobSparkTools } from "./session";

/** The script that runs page-agent in the recruiter's tab. */
export interface FillTab {
  run(tabId: number, request: FillerRun): Promise<FillerReply>;
  /** Whether the tab is already a form, or the link to it. */
  probe(tabId: number): Promise<PageProbe>;
  /** Opens the form in the same tab and waits for it to load. */
  open(tabId: number, url: string): Promise<void>;
}

/** What a fill with JobSpark's model costs (US-202). */
export const FORM_FILL_COST = AI_CREDIT_COSTS[AI_CREDIT_ACTION_FORM_FILL];
/** The relay picks the real model; page-agent only needs a name. */
const JOBSPARK_MODEL = "jobspark";

/** Fewer fields than this: an offer page, not its application form. */
const FORM_MIN_FIELDS = 3;

/** Asks the candidate through the side panel; null when nobody answered. */
export interface CandidateChannel {
  ask(question: string): Promise<{ answer: string | null; save: boolean }>;
}

export type EncodedDocument = { base64: string; name: string; mime: string };

export type FillOptions =
  | { kind: "no-access" }
  | { kind: "no-page" }
  | {
      kind: "page";
      host: string;
      url: string;
      /** The candidate's own key fills for free; else JobSpark's model, in credits. */
      personalKey: boolean;
      fillCost: number;
      balance: number | null;
      applications: Pick<ApplicationSummary, "id" | "title" | "company">[];
      suggestedId: string | null;
    };

export type FillOutcome = {
  creditsSpent: number;
  /** The form the extension opened from the offer page, if it did. */
  formUrl: string | null;
  success: boolean;
  summary: string;
  questionsAsked: number;
  answersSaved: number;
};

/** Who answers the in-page agent's model calls during a fill. */
type ModelRoute =
  | { kind: "personal"; baseURL: string; apiKey: string }
  | { kind: "jobspark"; baseURL: string; sessionId: string };

type ActiveFill = {
  tabId: number;
  route: ModelRoute;
  documents: Record<DocumentKind, EncodedDocument>;
  questionsAsked: number;
  answersSaved: number;
  /** Each question goes to the candidate once; the agent tends to re-ask. */
  asked: Map<string, string | null>;
};

const ALREADY_ASKED =
  "Déjà demandé au candidat, sans réponse : laisse ce champ vide, ne repose pas la question et passe au suivant.";
const TOO_MANY_QUESTIONS =
  "Plus de question au candidat pour ce formulaire : laisse les champs restants vides et termine.";
/** Beyond this, the candidate is not bothered again during this fill. */
const MAX_QUESTIONS = 8;

type ProfileRegistry = {
  activeProfileId: string | null;
  profiles: (FillProfile & { id: string })[];
};

const READY = (application: ApplicationSummary) =>
  application.status === "draft" &&
  Boolean(application.cvGeneratedAt && application.letterGeneratedAt);

const fileName = (kind: DocumentKind, profile: FillProfile) => {
  const who = `${profile.identity.firstName} ${profile.identity.lastName}`
    .replace(/[^\p{L}\p{N} -]/gu, "")
    .trim();
  const base = kind === "cv" ? "CV" : "Lettre de motivation";
  return `${who ? `${base} ${who}` : base}.pdf`;
};

/**
 * « Remplir » (US-197): page-agent fills the recruiter's form with the
 * candidate's profile and saved answers, attaches the CV and letter, and asks
 * the candidate anything else. It stops before the final button.
 */
export class Filling {
  private active: ActiveFill | null = null;
  private readonly filled = new Map<number, LastFill>();

  constructor(
    private readonly deps: {
      tools: JobSparkTools;
      pages: PageReader;
      tab: FillTab;
      aiKeys: AiKeyStore;
      candidate: CandidateChannel;
      download: (url: string) => Promise<{ base64: string; mime: string }>;
      /** JobSpark's model relay (US-202), with the extension's OAuth token. */
      relay: { origin: string; accessToken: () => Promise<string | null> };
      fetchFn?: typeof fetch;
    },
  ) {}

  async options(): Promise<FillOptions> {
    const tab = await this.deps.pages.activeTab();
    if (tab === "no-access") return { kind: "no-access" };
    if (!tab) return { kind: "no-page" };

    const [listed, aiKey, balance] = await Promise.all([
      this.deps.tools.call("list_applications"),
      this.deps.aiKeys.get(),
      this.deps.tools.call("get_credit_balance").then(readBalance, () => null),
    ]);
    const ready = (
      Array.isArray(listed) ? (listed as ApplicationSummary[]) : []
    ).filter(READY);
    const matching = findApplicationFor(ready, tab.url);

    return {
      applications: ready.map(({ id, title, company }) => ({
        company,
        id,
        title,
      })),
      host: new URL(tab.url).host,
      balance,
      fillCost: aiKey ? 0 : FORM_FILL_COST,
      kind: "page",
      personalKey: Boolean(aiKey),
      suggestedId: matching?.id ?? ready[0]?.id ?? null,
      url: tab.url,
    };
  }

  async fill(request: {
    applicationId: string;
    url: string;
  }): Promise<FillOutcome> {
    if (this.active) throw new Error("Un remplissage est déjà en cours.");
    const aiKey = await this.deps.aiKeys.get();
    const tab = await this.deps.pages.activeTab();
    if (!tab || tab === "no-access" || tab.url !== request.url) {
      throw new Error("L'onglet a changé : vérifiez à nouveau.");
    }

    const listed = (await this.deps.tools.call(
      "list_applications",
    )) as ApplicationSummary[];
    const application = listed.find(
      (entry) => entry.id === request.applicationId,
    );
    if (!application || !READY(application)) {
      throw new Error("Cette candidature n'a pas encore son CV et sa lettre.");
    }
    const registry = (await this.deps.tools.call(
      "get_profile",
    )) as ProfileRegistry;
    const profile =
      registry.profiles.find(
        (entry) => entry.id === registry.activeProfileId,
      ) ?? registry.profiles[0];
    if (!profile) throw new Error("Complétez d'abord votre profil JobSpark.");
    const answers = (await this.deps.tools.call("get_screening_answers", {
      profileId: profile.id,
    })) as FillAnswers;

    const documents = {
      cv: await this.document(application.id, "cv", profile),
      letter: await this.document(application.id, "letter", profile),
    };
    const formUrl = await this.openFormIfNeeded(tab.tabId);
    const route = await this.modelRoute(aiKey, application.id);
    this.active = {
      route,
      answersSaved: 0,
      asked: new Map(),
      documents,
      questionsAsked: 0,
      tabId: tab.tabId,
    };
    try {
      const reply = await this.deps.tab.run(tab.tabId, {
        llm: {
          baseURL: route.baseURL,
          model: aiKey?.model ?? JOBSPARK_MODEL,
        },
        task: buildFillTask(profile, answers, application),
        type: "filler/run",
      });
      this.filled.set(tab.tabId, {
        applicationId: application.id,
        documents: [documents.cv.name, documents.letter.name],
        tabId: tab.tabId,
      });
      return {
        answersSaved: this.active.answersSaved,
        creditsSpent: route.kind === "jobspark" ? FORM_FILL_COST : 0,
        formUrl,
        questionsAsked: this.active.questionsAsked,
        success: reply.success,
        summary: reply.summary,
      };
    } finally {
      this.active = null;
    }
  }

  /**
   * On the offer's page, « Remplir » opens its form first: the same-site
   * « Postuler » / « Apply » link. A page with fields is already the form.
   */
  private async openFormIfNeeded(tabId: number): Promise<string | null> {
    const probe = await this.deps.tab.probe(tabId);
    if (probe.fieldCount >= FORM_MIN_FIELDS || !probe.applyLink) return null;
    await this.deps.tab.open(tabId, probe.applyLink);
    return probe.applyLink;
  }

  /** What the last fill of this tab used, for the review before sending. */
  lastFill(tabId: number): LastFill | null {
    return this.filled.get(tabId) ?? null;
  }

  /**
   * What the script in the recruiter's tab may ask: only the tab being
   * filled, only while it is being filled.
   */
  async handle(senderTabId: number | undefined, request: FillerRequest) {
    const active = this.active;
    if (!active || senderTabId !== active.tabId) {
      return { error: "Aucun remplissage en cours pour cet onglet." };
    }
    switch (request.type) {
      case "filler/llm-fetch":
        return this.relayModelCall(active.route, request);
      case "filler/document":
        return active.documents[request.kind];
      case "filler/ask":
        return { answer: await this.askCandidate(active, request.question) };
    }
  }

  private async document(
    applicationId: string,
    kind: DocumentKind,
    profile: FillProfile,
  ) {
    const link = (await this.deps.tools.call("get_document_download_url", {
      applicationId,
      format: "pdf",
      kind,
    })) as { url: string };
    const file = await this.deps.download(link.url);
    return { ...file, name: fileName(kind, profile) };
  }

  /**
   * The candidate's own key when set (free); otherwise a JobSpark fill
   * session, two credits, opened only now that everything else is ready.
   */
  private async modelRoute(
    aiKey: AiKeySettings | null,
    applicationId: string,
  ): Promise<ModelRoute> {
    if (aiKey) {
      return { apiKey: aiKey.apiKey, baseURL: aiKey.baseURL, kind: "personal" };
    }
    const started = (await this.deps.tools.call("start_form_fill", {
      applicationId,
    })) as { fillSessionId: string };
    return {
      baseURL: `${this.deps.relay.origin}/agent/llm`,
      kind: "jobspark",
      sessionId: started.fillSessionId,
    };
  }

  private async relayModelCall(
    route: ModelRoute,
    request: { url: string; body?: string },
  ) {
    if (!request.url.startsWith(`${route.baseURL}/`)) {
      return { error: "Adresse du modèle non autorisée." };
    }
    const send = async () => {
      const authorization =
        route.kind === "personal"
          ? `Bearer ${route.apiKey}`
          : `Bearer ${(await this.deps.relay.accessToken()) ?? ""}`;
      return (this.deps.fetchFn ?? ((u, i) => fetch(u, i)))(request.url, {
        body: request.body,
        headers: {
          authorization,
          "content-type": "application/json",
          ...(route.kind === "jobspark" && {
            "x-jobspark-fill-session": route.sessionId,
          }),
        },
        method: "POST",
      });
    };
    let response = await send();
    if (response.status === 401 && route.kind === "jobspark") {
      // The access token expired mid-fill: any MCP call refreshes it.
      await this.deps.tools.call("get_credit_balance").catch(() => undefined);
      response = await send();
    }
    return { body: await response.text(), status: response.status };
  }

  private async askCandidate(active: ActiveFill, question: string) {
    const key = screeningQuestionKey(question);
    const earlier = [...active.asked.keys()].find(
      (asked) => asked === key || sameQuestion(asked, key),
    );
    if (earlier !== undefined)
      return active.asked.get(earlier) ?? ALREADY_ASKED;
    if (active.questionsAsked >= MAX_QUESTIONS) return TOO_MANY_QUESTIONS;
    active.questionsAsked += 1;
    const { answer, save } = await this.deps.candidate.ask(question);
    active.asked.set(key, answer);
    if (answer && save) {
      try {
        await this.deps.tools.call("save_screening_answer", {
          answer,
          question,
        });
        active.answersSaved += 1;
      } catch {
        // Not fatal: the form still gets the answer. An older connection may
        // lack answers:write until the candidate reconnects.
      }
    }
    return answer;
  }
}
