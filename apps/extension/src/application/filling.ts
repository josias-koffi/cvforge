import {
  buildFillTask,
  type FillAnswers,
  type FillProfile,
} from "../domain/fill";
import { findApplicationFor, type ApplicationSummary } from "../domain/offer";
import { screeningQuestionKey } from "@cvforge/types";
import type { FillerReply, FillerRequest, FillerRun } from "../filler-messages";
import type { DocumentKind } from "../page/attach";
import type { PageReader } from "./preparation";
import type { AiKeyStore, JobSparkTools } from "./session";

/** The script that runs page-agent in the recruiter's tab. */
export interface FillTab {
  run(tabId: number, request: FillerRun): Promise<FillerReply>;
}

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
      aiKeyConfigured: boolean;
      applications: Pick<ApplicationSummary, "id" | "title" | "company">[];
      suggestedId: string | null;
    };

export type FillOutcome = {
  success: boolean;
  summary: string;
  questionsAsked: number;
  answersSaved: number;
};

type ActiveFill = {
  tabId: number;
  documents: Record<DocumentKind, EncodedDocument>;
  questionsAsked: number;
  answersSaved: number;
  /** Each question goes to the candidate once; the agent tends to re-ask. */
  asked: Map<string, string | null>;
};

const ALREADY_ASKED =
  "Déjà demandé au candidat, sans réponse : laisse ce champ vide et passe au suivant.";

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

  constructor(
    private readonly deps: {
      tools: JobSparkTools;
      pages: PageReader;
      tab: FillTab;
      aiKeys: AiKeyStore;
      candidate: CandidateChannel;
      download: (url: string) => Promise<{ base64: string; mime: string }>;
      fetchFn?: typeof fetch;
    },
  ) {}

  async options(): Promise<FillOptions> {
    const tab = await this.deps.pages.activeTab();
    if (tab === "no-access") return { kind: "no-access" };
    if (!tab) return { kind: "no-page" };

    const [listed, aiKey] = await Promise.all([
      this.deps.tools.call("list_applications"),
      this.deps.aiKeys.get(),
    ]);
    const ready = (
      Array.isArray(listed) ? (listed as ApplicationSummary[]) : []
    ).filter(READY);
    const matching = findApplicationFor(ready, tab.url);

    return {
      aiKeyConfigured: Boolean(aiKey),
      applications: ready.map(({ id, title, company }) => ({
        company,
        id,
        title,
      })),
      host: new URL(tab.url).host,
      kind: "page",
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
    if (!aiKey) throw new Error("Ajoutez d'abord votre clé IA personnelle.");
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
    this.active = {
      answersSaved: 0,
      asked: new Map(),
      documents,
      questionsAsked: 0,
      tabId: tab.tabId,
    };
    try {
      const reply = await this.deps.tab.run(tab.tabId, {
        llm: { baseURL: aiKey.baseURL, model: aiKey.model },
        task: buildFillTask(profile, answers, application),
        type: "filler/run",
      });
      return {
        answersSaved: this.active.answersSaved,
        questionsAsked: this.active.questionsAsked,
        success: reply.success,
        summary: reply.summary,
      };
    } finally {
      this.active = null;
    }
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
        return this.relayModelCall(request);
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

  private async relayModelCall(request: { url: string; body?: string }) {
    const aiKey = await this.deps.aiKeys.get();
    if (!aiKey) return { error: "Clé IA absente." };
    if (!request.url.startsWith(`${aiKey.baseURL}/`)) {
      return { error: "Adresse du modèle non autorisée." };
    }
    const response = await (this.deps.fetchFn ?? ((u, i) => fetch(u, i)))(
      request.url,
      {
        body: request.body,
        headers: {
          authorization: `Bearer ${aiKey.apiKey}`,
          "content-type": "application/json",
        },
        method: "POST",
      },
    );
    return { body: await response.text(), status: response.status };
  }

  private async askCandidate(active: ActiveFill, question: string) {
    const key = screeningQuestionKey(question);
    if (active.asked.has(key)) return active.asked.get(key) ?? ALREADY_ASKED;
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
