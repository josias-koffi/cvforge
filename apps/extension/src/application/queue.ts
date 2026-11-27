import { readBalance } from "../domain/connection";
import type { IdentityField } from "../domain/fill";
import {
  exclusion,
  dailyPicks,
  interrupted,
  MAX_QUEUE,
  mergeOffers,
  newQueue,
  queueReport,
  remainingBudget,
  suggested,
  type Queue,
  type QueueItem,
  type QueueOffer,
  type QueueReport,
  type RecentOffer,
} from "../domain/queue";
import type { KeyValueStore } from "../infrastructure/local-store";
import { FORM_FILL_COST, type Filling, type ProfileGap } from "./filling";
import {
  AlreadySentError,
  CostChangedError,
  type ActiveTab,
  type Preparation,
} from "./preparation";
import type { Sending, SendOutcome } from "./sending";
import {
  ConnectionRevokedError,
  type AiKeyStore,
  type JobSparkTools,
} from "./session";

/** The browser tabs the queue works in. */
export interface QueueTabs {
  /** Opens `url` in a background tab and waits for it to load. */
  open(url: string): Promise<ActiveTab>;
  /** The tab as it is now, or null once closed. */
  current(tabId: number): Promise<ActiveTab | null>;
  /** Brings the tab to the front, for a captcha or the final click. */
  focus(tabId: number): Promise<void>;
  /** Web pages open in the candidate's window. */
  openOffers(): Promise<ActiveTab[]>;
  /** Closes a tab the queue opened itself. */
  close(tabId: number): Promise<void>;
}

export type QueueCandidates =
  | { kind: "no-access" }
  | {
      kind: "ready";
      offers: QueueOffer[];
      /** Keys picked by default: best scores, sites that accept automation. */
      suggested: string[];
      /** « Offres du jour » (US-206): this morning's offers, best first. */
      daily: string[];
      /** Most one offer can cost: every preparation step and a fill. */
      fillCost: number;
      balance: number | null;
      profileGaps: ProfileGap[];
    };

const QUEUE_KEY = "queue";

const message = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

/**
 * The application queue (US-204): up to ten offers prepared and filled one
 * after the other in background tabs, nobody asked meanwhile. Nothing is
 * sent: each filled form waits for the candidate's « Valider et envoyer »
 * (ADR-034 §6 level 1), with every guard of US-198.
 */
export class ApplicationQueue {
  private queue: Queue | null = null;
  private loaded = false;

  constructor(
    private readonly deps: {
      tools: JobSparkTools;
      aiKeys: AiKeyStore;
      tabs: QueueTabs;
      canReadPages: () => Promise<boolean>;
      preparation: Pick<Preparation, "prepareTab">;
      filling: Pick<
        Filling,
        "fillTab" | "formReachable" | "keepIdentity" | "profileGaps"
      >;
      sending: Pick<Sending, "reviewTab" | "send">;
      store: KeyValueStore;
      keepAlive: () => () => void;
      /** Tells the candidate the queue is done, panel closed or not (US-209). */
      notify?: (report: QueueReport) => Promise<void>;
      newId?: () => string;
    },
  ) {}

  async candidates(): Promise<QueueCandidates> {
    if (!(await this.deps.canReadPages())) return { kind: "no-access" };
    const [recent, daily, tabs, aiKey, balance, profileGaps] =
      await Promise.all([
        this.deps.tools
          .call("list_recent_offers", { limit: 30 })
          .catch(() => []) as Promise<RecentOffer[]>,
        this.deps.tools
          .call("get_daily_offers")
          .then((digest) => (digest as { matches?: RecentOffer[] }).matches)
          .catch(() => undefined),
        this.deps.tabs.openOffers(),
        this.deps.aiKeys.get(),
        this.deps.tools
          .call("get_credit_balance")
          .then(readBalance, () => null),
        this.deps.filling.profileGaps(),
      ]);
    const offers = mergeOffers(
      Array.isArray(recent) ? recent : [],
      tabs,
      Array.isArray(daily) ? daily : [],
    );
    const picks = dailyPicks(offers);
    return {
      balance,
      daily: picks,
      fillCost: aiKey ? 0 : FORM_FILL_COST,
      kind: "ready",
      offers,
      profileGaps,
      // This morning's offers when there are some, else the best recent ones.
      suggested: picks.length ? picks : suggested(offers),
    };
  }

  /** Starts the queue; the work goes on after the reply, panel open or not. */
  async start(request: {
    offers: QueueOffer[];
    budget: number;
    identity?: Partial<Record<IdentityField, string>>;
  }): Promise<Queue> {
    const current = await this.status();
    if (current?.running) throw new Error("Une file est déjà en cours.");
    if (request.offers.length === 0) throw new Error("Choisissez une offre.");
    if (request.offers.length > MAX_QUEUE) {
      throw new Error(`${MAX_QUEUE} offres au plus par file.`);
    }
    const budget = Math.floor(request.budget);
    if (!Number.isFinite(budget) || budget < 0) {
      throw new Error("Budget non valide.");
    }
    const balance = await this.deps.tools
      .call("get_credit_balance")
      .then(readBalance, () => null);
    if (balance !== null && budget > balance) {
      throw new Error(`Votre solde (${balance} crédits) est sous ce budget.`);
    }
    await this.deps.filling.keepIdentity(request.identity ?? {});

    this.queue = newQueue(
      this.deps.newId?.() ?? crypto.randomUUID(),
      request.offers,
      budget,
    );
    await this.save();
    void this.run();
    return this.queue;
  }

  async status(): Promise<Queue | null> {
    if (!this.loaded) {
      this.loaded = true;
      const saved = await this.deps.store.get<Queue>(QUEUE_KEY);
      // A queue still "running" here was cut short by a restart.
      this.queue = saved ? interrupted(saved) : null;
      if (saved?.running) await this.save();
    }
    return this.queue;
  }

  async stop(): Promise<Queue | null> {
    const queue = await this.status();
    if (queue?.running) {
      queue.stopRequested = true;
      await this.save();
    }
    return queue;
  }

  /** Forgets a finished queue; its tabs stay open. */
  async clear(): Promise<null> {
    const queue = await this.status();
    if (queue?.running) throw new Error("Arrêtez d'abord la file.");
    this.queue = null;
    await this.deps.store.remove(QUEUE_KEY);
    return null;
  }

  /** The tab of the first form waiting for the candidate, if any. */
  async firstWaitingTab(): Promise<number | null> {
    const item = (await this.status())?.items.find(
      (entry) =>
        (entry.state === "ready" || entry.state === "incomplete") &&
        entry.tabId !== null,
    );
    return item?.tabId ?? null;
  }

  /** Shows the item's tab: to check it, finish a field or solve a captcha. */
  async show(index: number): Promise<void> {
    const item = await this.item(index);
    if (item.tabId === null) throw new Error("Cet onglet n'existe plus.");
    await this.deps.tabs.focus(item.tabId);
  }

  /**
   * « Valider et envoyer » for one item: its tab comes to the front, then
   * the sending of US-198 re-checks everything right before the click.
   */
  async send(index: number): Promise<SendOutcome> {
    const item = await this.item(index);
    if (item.state !== "ready" && item.state !== "incomplete") {
      throw new Error("Cette candidature n'est pas prête à l'envoi.");
    }
    const tab =
      item.tabId === null ? null : await this.deps.tabs.current(item.tabId);
    if (!tab || !item.applicationId) {
      throw new Error("L'onglet de cette candidature a été fermé.");
    }
    await this.deps.tabs.focus(tab.tabId);
    const outcome = await this.deps.sending.send({
      applicationId: item.applicationId,
      url: tab.url,
    });
    this.update(item, {
      reason: null,
      state: outcome.confirmed ? "sent" : "to-check",
      step: null,
    });
    await this.save();
    return outcome;
  }

  private async item(index: number): Promise<QueueItem> {
    const item = (await this.status())?.items[index];
    if (!item) throw new Error("Candidature introuvable dans la file.");
    return item;
  }

  private async run() {
    const queue = this.queue!;
    const release = this.deps.keepAlive();
    try {
      for (const item of queue.items) {
        if (item.state !== "waiting") continue;
        if (queue.stopRequested) {
          this.update(item, { reason: "File arrêtée.", state: "skipped" });
          continue;
        }
        await this.process(queue, item);
        await this.save();
      }
    } finally {
      queue.running = false;
      release();
      await this.save();
      await this.deps.notify?.(queueReport(queue)).catch(() => undefined);
    }
  }

  private async process(queue: Queue, item: QueueItem) {
    const skip = async (reason: string) => {
      // A tab the queue opened for nothing is closed; the candidate's stay.
      if (item.tabId !== null && item.offer.tabId === undefined) {
        await this.deps.tabs.close(item.tabId).catch(() => undefined);
        item.tabId = null;
      }
      this.update(item, { reason, state: "skipped", step: null });
    };
    try {
      const fillCost = (await this.deps.aiKeys.get()) ? 0 : FORM_FILL_COST;
      const excluded = exclusion(item.offer.url);
      if (excluded) return skip(excluded);

      await this.step(item, "open");
      const tab = await this.tabFor(item);
      const redirected = exclusion(tab.url);
      if (redirected) return skip(redirected);
      if (!(await this.deps.filling.formReachable(tab.tabId))) {
        return skip("Aucun formulaire de candidature sur la page.");
      }
      if (remainingBudget(queue) < fillCost) return skip("Budget atteint.");

      await this.step(item, "prepare");
      const prepared = await this.deps.preparation.prepareTab(tab, {
        applicationId: item.applicationId,
        maxCost: remainingBudget(queue) - fillCost,
      });
      this.spend(queue, item, prepared.creditsSpent);
      this.update(item, { applicationId: prepared.applicationId });

      await this.step(item, "fill");
      const filled = await this.deps.filling.fillTab(
        tab,
        { applicationId: prepared.applicationId },
        { unattended: true },
      );
      this.spend(queue, item, filled.creditsSpent);

      await this.step(item, "review");
      const now = await this.deps.tabs.current(tab.tabId);
      const review = now ? await this.deps.sending.reviewTab(now) : null;
      if (!review || review.kind !== "review") {
        return this.update(item, {
          reason:
            "Formulaire rempli, récapitulatif indisponible : ouvrez l'onglet.",
          state: "incomplete",
          step: null,
        });
      }
      const reason =
        review.refusal ??
        (review.captcha ? "Captcha à résoudre dans l'onglet." : null);
      this.update(item, {
        captcha: review.captcha,
        filledCount: review.fields.length,
        reason,
        state: reason ? "incomplete" : "ready",
        step: null,
      });
    } catch (error) {
      if (error instanceof AlreadySentError) return skip(error.message);
      if (error instanceof CostChangedError) {
        return skip(`Budget atteint : il faudrait ${error.cost} crédits.`);
      }
      if (error instanceof ConnectionRevokedError) queue.stopRequested = true;
      this.update(item, {
        reason: message(error),
        state: "failed",
        step: null,
      });
    }
  }

  /** The offer's open tab, or a new background tab on its address. */
  private async tabFor(item: QueueItem): Promise<ActiveTab> {
    const open =
      item.tabId === null ? null : await this.deps.tabs.current(item.tabId);
    const tab = open ?? (await this.deps.tabs.open(item.offer.url));
    this.update(item, { tabId: tab.tabId });
    return tab;
  }

  private async step(item: QueueItem, step: QueueItem["step"]) {
    this.update(item, { state: "working", step });
    await this.save();
  }

  private spend(queue: Queue, item: QueueItem, credits: number) {
    queue.spent += credits;
    item.creditsSpent += credits;
  }

  private update(item: QueueItem, patch: Partial<QueueItem>) {
    Object.assign(item, patch);
  }

  private async save() {
    if (this.queue) await this.deps.store.set(QUEUE_KEY, this.queue);
  }
}
