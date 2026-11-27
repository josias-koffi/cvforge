import {
  buildFillTask,
  prefillData,
  type IdentityField,
  type FillAnswers,
  type FillProfile,
} from "../domain/fill";
import { readBalance } from "../domain/connection";
import { findApplicationFor, type ApplicationSummary } from "../domain/offer";
import { AI_CREDIT_ACTION_FORM_FILL, AI_CREDIT_COSTS } from "@cvforge/types";
import type {
  FillerReply,
  FillerRequest,
  FillerRun,
  PageProbe,
} from "../filler-messages";
import type { DocumentKind } from "../page/attach";
import type { PrefillData } from "../domain/field-match";
import type { PrefillReport } from "../page/prefill";
import type { ActiveTab, PageReader } from "./preparation";
import type { LastFill } from "./sending";
import {
  CandidateData,
  gapsOf,
  type EncodedDocument,
  type ProfileGap,
} from "./candidate-data";
import { askCandidate, type QuestionState } from "./fill-questions";
import { ModelRelay, type ModelRoute } from "./model-relay";
import type { AiKeyStore, JobSparkTools } from "./session";

/** The script that runs page-agent in the recruiter's tab. */
export interface FillTab {
  run(tabId: number, request: FillerRun): Promise<FillerReply>;
  /** The pass without a model: what the data answers for sure (US-203). */
  prefill(
    tabId: number,
    request: {
      data: PrefillData;
      documents: Record<DocumentKind, EncodedDocument>;
    },
  ): Promise<PrefillReport>;
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
      /** Identity data the profile lacks: asked in the panel before filling. */
      profileGaps: { field: IdentityField; label: string }[];
    };

export type { EncodedDocument, ProfileGap };

export type FillOutcome = {
  creditsSpent: number;
  /** Fields the page script filled without a model (US-203). */
  prefilled: { label: string; value: string }[];
  /** Whether the model was needed for what remained. */
  aiUsed: boolean;
  /** Optional fields left empty: the candidate may have the model try them. */
  optionalEmpty: string[];
  /** The form the extension opened from the offer page, if it did. */
  formUrl: string | null;
  success: boolean;
  summary: string;
  questionsAsked: number;
  answersSaved: number;
};

type ActiveFill = {
  tabId: number;
  /** What the agent may be told without asking the candidate. */
  data: { profile: FillProfile; answers: FillAnswers };
  route: ModelRoute;
  documents: Record<DocumentKind, EncodedDocument>;
} & QuestionState;

const READY = (application: ApplicationSummary) =>
  application.status === "draft" &&
  Boolean(application.cvGeneratedAt && application.letterGeneratedAt);

/**
 * « Remplir » (US-197): page-agent fills the recruiter's form with the
 * candidate's profile and saved answers, attaches the CV and letter, and asks
 * the candidate anything else. It stops before the final button.
 */
export class Filling {
  private active: ActiveFill | null = null;
  private readonly filled = new Map<number, LastFill>();
  private readonly models: ModelRelay;
  private readonly candidateData: CandidateData;

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
  ) {
    this.models = new ModelRelay(deps);
    this.candidateData = new CandidateData(deps);
  }

  async options(): Promise<FillOptions> {
    const tab = await this.deps.pages.activeTab();
    if (tab === "no-access") return { kind: "no-access" };
    if (!tab) return { kind: "no-page" };

    const [listed, aiKey, balance, profile] = await Promise.all([
      this.deps.tools.call("list_applications"),
      this.deps.aiKeys.get(),
      this.deps.tools.call("get_credit_balance").then(readBalance, () => null),
      this.candidateData.completedProfile().catch(() => null),
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
      profileGaps: profile ? gapsOf(profile.profile) : [],
      suggestedId: matching?.id ?? ready[0]?.id ?? null,
      url: tab.url,
    };
  }

  async fill(request: {
    applicationId: string;
    url: string;
    /** What the candidate typed in the panel for the profile's gaps. */
    identity?: Partial<Record<IdentityField, string>>;
    /** Also have the model try the optional fields the script left empty. */
    completeOptional?: boolean;
  }): Promise<FillOutcome> {
    const tab = await this.deps.pages.activeTab();
    if (!tab || tab === "no-access" || tab.url !== request.url) {
      throw new Error("L'onglet a changé : vérifiez à nouveau.");
    }
    return this.fillTab(tab, request);
  }

  /**
   * Fills the form shown in `tab`, in the background for the queue (US-204):
   * `unattended` never asks the candidate, the field stays empty instead.
   */
  async fillTab(
    tab: ActiveTab,
    request: {
      applicationId: string;
      identity?: Partial<Record<IdentityField, string>>;
      completeOptional?: boolean;
    },
    mode: { unattended?: boolean } = {},
  ): Promise<FillOutcome> {
    if (this.active) throw new Error("Un remplissage est déjà en cours.");
    const aiKey = await this.deps.aiKeys.get();

    const listed = (await this.deps.tools.call(
      "list_applications",
    )) as ApplicationSummary[];
    const application = listed.find(
      (entry) => entry.id === request.applicationId,
    );
    if (!application || !READY(application)) {
      throw new Error("Cette candidature n'a pas encore son CV et sa lettre.");
    }
    await this.candidateData.keepIdentity(request.identity ?? {});
    const completed = await this.candidateData.completedProfile();
    if (!completed) throw new Error("Complétez d'abord votre profil JobSpark.");
    const { answers, profile } = completed;

    const documents = {
      cv: await this.candidateData.document(application.id, "cv", profile),
      letter: await this.candidateData.document(
        application.id,
        "letter",
        profile,
      ),
    };
    const formUrl = await this.openFormIfNeeded(tab.tabId);
    const pre = await this.deps.tab.prefill(tab.tabId, {
      data: prefillData(profile, answers),
      documents,
    });
    const documentNames = [documents.cv.name, documents.letter.name];
    this.filled.set(tab.tabId, {
      applicationId: application.id,
      documents: pre.attached.length ? pre.attached : documentNames,
      tabId: tab.tabId,
    });
    const base = {
      formUrl,
      optionalEmpty: pre.optionalEmpty,
      prefilled: pre.filled,
    };
    const needsModel =
      pre.remaining.length > 0 ||
      (request.completeOptional === true && pre.optionalEmpty.length > 0);
    if (!needsModel) {
      return {
        ...base,
        aiUsed: false,
        answersSaved: 0,
        creditsSpent: 0,
        questionsAsked: 0,
        success: true,
        summary: `Rempli sans IA : ${pre.filled.length} champ(s)${pre.attached.length ? `, ${pre.attached.length} document(s) joint(s)` : ""}.`,
      };
    }

    const route = await this.models.route(aiKey, application.id);
    this.active = {
      data: { answers, profile },
      route,
      answersSaved: 0,
      asked: new Map(),
      documents,
      questionsAsked: 0,
      tabId: tab.tabId,
      unattended: mode.unattended === true,
    };
    try {
      const reply = await this.deps.tab.run(tab.tabId, {
        llm: {
          baseURL: route.baseURL,
          model: aiKey?.model ?? JOBSPARK_MODEL,
        },
        task: buildFillTask(profile, answers, application, {
          attached: pre.attached,
          // A search box typed into but not picked (Greenhouse « Location »)
          // is still required: the model finishes it.
          filled: pre.filled
            .map((field) => field.label)
            .filter((label) => !pre.remaining.includes(label)),
          optionalEmpty: request.completeOptional ? pre.optionalEmpty : [],
          remaining: pre.remaining,
        }),
        type: "filler/run",
      });
      this.filled.set(tab.tabId, {
        applicationId: application.id,
        documents: documentNames,
        tabId: tab.tabId,
      });
      return {
        ...base,
        aiUsed: true,
        answersSaved: this.active.answersSaved,
        creditsSpent: route.kind === "jobspark" ? FORM_FILL_COST : 0,
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
  /** A form is in the tab, or a same-site link leads to it: nothing spent yet. */
  async formReachable(tabId: number): Promise<boolean> {
    const probe = await this.deps.tab.probe(tabId);
    return probe.fieldCount >= FORM_MIN_FIELDS || probe.applyLink !== null;
  }

  private async openFormIfNeeded(tabId: number): Promise<string | null> {
    const probe = await this.deps.tab.probe(tabId);
    if (probe.fieldCount >= FORM_MIN_FIELDS || !probe.applyLink) return null;
    await this.deps.tab.open(tabId, probe.applyLink);
    return probe.applyLink;
  }

  /** Identity data the profile lacks, to ask in the panel before filling. */
  profileGaps(): Promise<ProfileGap[]> {
    return this.candidateData.gaps();
  }

  /** Profile gaps typed in the panel, kept as answers (no profile write). */
  keepIdentity(given: Partial<Record<IdentityField, string>>) {
    return this.candidateData.keepIdentity(given);
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
        return this.models.call(active.route, request);
      case "filler/document":
        return active.documents[request.kind];
      case "filler/ask":
        return {
          answer: await askCandidate(active, request.question, this.deps),
        };
    }
  }
}
