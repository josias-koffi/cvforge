import {
  findApplicationFor,
  planPreparation,
  usablePageText,
  type ApplicationSummary,
  type PreparationPlan,
} from "../domain/offer";
import { readBalance } from "../domain/connection";
import { ConnectionRevokedError, type JobSparkTools } from "./session";

export class AlreadySentError extends Error {
  constructor() {
    super("Candidature déjà envoyée pour cette offre.");
  }
}

/** The plan costs more than what was announced, or than the queue's budget. */
export class CostChangedError extends Error {
  constructor(readonly cost: number) {
    super("Le coût a changé depuis l'annonce : vérifiez à nouveau.");
  }
}

/** The tab the candidate is looking at. */
export type ActiveTab = { tabId: number; url: string; title: string };

export interface PageReader {
  /** The active tab, or null when the extension may not read it. */
  activeTab(): Promise<ActiveTab | null | "no-access">;
  /** The visible text of the page, read in the candidate's browser. */
  readText(tabId: number): Promise<string>;
}

export type OfferInspection =
  | { kind: "no-access" }
  | { kind: "no-page" }
  | {
      kind: "page";
      page: { url: string; title: string; host: string };
      existing: ApplicationSummary | null;
      plan: PreparationPlan;
      balance: number | null;
    };

export type PreparationResult = {
  applicationId: string;
  title: string | null;
  company: string | null;
  creditsSpent: number;
  balanceAfter: number | null;
};

type ImportAnswer = {
  applicationId: string;
  title?: string | null;
  company?: string | null;
  creditsSpent?: number;
  balanceAfter?: number;
};
type GenerationAnswer = { creditsSpent?: number; balanceAfter?: number };

/**
 * "Préparer" from the offer's tab (US-196): import the offer once, then the
 * tailored CV and letter, after the candidate accepted the announced cost.
 */
export class Preparation {
  constructor(
    private readonly deps: { tools: JobSparkTools; pages: PageReader },
  ) {}

  async inspect(): Promise<OfferInspection> {
    const tab = await this.deps.pages.activeTab();
    if (tab === "no-access") return { kind: "no-access" };
    if (!tab) return { kind: "no-page" };

    const [existing, balance] = await Promise.all([
      this.existingFor(tab.url),
      this.deps.tools.call("get_credit_balance").then(readBalance),
    ]);
    return {
      balance,
      existing,
      kind: "page",
      page: { host: new URL(tab.url).host, title: tab.title, url: tab.url },
      plan: planPreparation(existing),
    };
  }

  /**
   * Runs what is left for the offer the candidate agreed on. `accepted` is
   * the page and cost they saw: if the tab changed or the plan grew since,
   * nothing is spent.
   */
  async prepare(accepted: {
    url: string;
    cost: number;
  }): Promise<PreparationResult> {
    const tab = await this.deps.pages.activeTab();
    if (!tab || tab === "no-access" || tab.url !== accepted.url) {
      throw new Error("L'onglet a changé : vérifiez à nouveau l'offre.");
    }
    return this.prepareTab(tab, { maxCost: accepted.cost });
  }

  /**
   * Runs what is left for the offer shown in `tab`, within `maxCost`. The
   * queue (US-204) calls it on background tabs; `applicationId` is the
   * application JobSpark already has for this offer, if any.
   */
  async prepareTab(
    tab: ActiveTab,
    limits: { maxCost: number; applicationId?: string | null },
  ): Promise<PreparationResult> {
    const existing = await this.existingFor(tab.url, limits.applicationId);
    const plan = planPreparation(existing);
    if (plan.alreadySent) throw new AlreadySentError();
    if (plan.cost > limits.maxCost) throw new CostChangedError(plan.cost);

    let spent = 0;
    let balanceAfter: number | null = null;
    const record = (answer: GenerationAnswer) => {
      spent += answer.creditsSpent ?? 0;
      balanceAfter = answer.balanceAfter ?? balanceAfter;
    };

    let application: ImportAnswer;
    if (existing) {
      application = {
        applicationId: existing.id,
        company: existing.company,
        title: existing.title,
      };
    } else {
      application = await this.importOffer(tab);
      record(application);
    }
    const args = { applicationId: application.applicationId };
    if (plan.steps.includes("cv")) {
      record(
        (await this.deps.tools.call("generate_cv", args)) as GenerationAnswer,
      );
    }
    if (plan.steps.includes("letter")) {
      record(
        (await this.deps.tools.call(
          "generate_cover_letter",
          args,
        )) as GenerationAnswer,
      );
    }

    return {
      applicationId: application.applicationId,
      balanceAfter,
      company: application.company ?? null,
      creditsSpent: spent,
      title: application.title ?? null,
    };
  }

  private async existingFor(url: string, applicationId?: string | null) {
    const listed = (await this.deps.tools.call(
      "list_applications",
    )) as ApplicationSummary[];
    const applications = Array.isArray(listed) ? listed : [];
    return (
      applications.find((entry) => entry.id === applicationId) ??
      findApplicationFor(applications, url)
    );
  }

  /**
   * The text the candidate's browser shows, with the page address: works on
   * sites that refuse our server or draw the offer with JavaScript. The
   * server reads the address alone only when the page text is too thin.
   */
  private async importOffer(tab: ActiveTab): Promise<ImportAnswer> {
    const offerText = usablePageText(
      await this.deps.pages.readText(tab.tabId).catch(() => ""),
    );
    try {
      return (await this.deps.tools.call("import_offer", {
        url: tab.url,
        ...(offerText ? { offerText } : {}),
      })) as ImportAnswer;
    } catch (error) {
      if (error instanceof ConnectionRevokedError) throw error;
      throw new Error(
        `JobSpark n'a pas pu lire cette offre : ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
