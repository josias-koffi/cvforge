import { normalizeOfferUrl, STEP_COSTS } from "./offer";

/**
 * The application queue (US-204): up to ten offers prepared and filled one
 * after the other in background tabs, then sent one click each. Pure rules;
 * the orchestration lives in `application/queue.ts`.
 */

export const MAX_QUEUE = 10;

/** An offer the candidate may put in the queue. */
export type QueueOffer = {
  /** Stable key in the queue: the job id, or the tab's address. */
  key: string;
  source: "jobspark" | "tab";
  url: string;
  title: string;
  company: string | null;
  /** An open tab already showing the offer. */
  tabId?: number;
  /** The candidate's application for this offer, when JobSpark has one. */
  applicationId?: string | null;
  score?: number | null;
  /** In this morning's selection (US-206). */
  daily?: boolean;
};

export type QueueItemState =
  | "waiting"
  | "working"
  /** Filled, every required field set: one click sends it. */
  | "ready"
  /** Filled, but something is left for the candidate (field, captcha, other site). */
  | "incomplete"
  /** Left out without spending: other site, no form, budget, already sent. */
  | "skipped"
  | "failed"
  | "sent"
  /** Sent, no confirmation page seen. */
  | "to-check";

export type QueueStep = "open" | "prepare" | "fill" | "review";

export type QueueItem = {
  offer: QueueOffer;
  state: QueueItemState;
  step: QueueStep | null;
  reason: string | null;
  tabId: number | null;
  applicationId: string | null;
  creditsSpent: number;
  /** Fields the page holds after the fill. */
  filledCount: number;
  /** A captcha waits in the tab (US-209); absent from queues saved before. */
  captcha?: boolean;
  /** Open answers drafted by the extension, to read before sending (US-208). */
  drafted?: number;
};

export type Queue = {
  id: string;
  budget: number;
  spent: number;
  running: boolean;
  stopRequested: boolean;
  items: QueueItem[];
};

/** Every preparation step plus a fill: the most an offer can cost. */
export const maxOfferCost = (fillCost: number) =>
  STEP_COSTS.import + STEP_COSTS.cv + STEP_COSTS.letter + fillCost;

const LOGIN_WALLS: [RegExp, string][] = [
  [/(^|\.)linkedin\.com$/i, "LinkedIn interdit l'envoi automatique."],
  [/(^|\.)indeed\.[a-z.]+$/i, "Indeed interdit l'envoi automatique."],
  [
    /(^|\.)(myworkdayjobs|workday)\.com$/i,
    "Workday demande un compte candidat.",
  ],
  [
    /(^|\.)francetravail\.fr$/i,
    "France Travail demande de se connecter pour postuler.",
  ],
];

/** Why this address cannot be applied to unattended, or null. */
export function exclusion(url: string): string | null {
  let host: string;
  try {
    const parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol)) return "Adresse non valide.";
    host = parsed.host;
  } catch {
    return "Adresse non valide.";
  }
  return LOGIN_WALLS.find(([site]) => site.test(host))?.[1] ?? null;
}

/**
 * The offers ticked by default: JobSpark's, on sites that accept automation,
 * best score first. Open tabs are never ticked for the candidate: one may be
 * their mailbox, not an offer.
 */
export function suggested(
  offers: QueueOffer[],
  only: (offer: QueueOffer) => boolean = () => true,
): string[] {
  return offers
    .map((offer, index) => ({ index, offer }))
    .filter(
      ({ offer }) =>
        offer.source === "jobspark" &&
        exclusion(offer.url) === null &&
        only(offer),
    )
    .sort(
      (a, b) =>
        (b.offer.score ?? 0) - (a.offer.score ?? 0) || a.index - b.index,
    )
    .slice(0, MAX_QUEUE)
    .map(({ offer }) => offer.key);
}

/** « Offres du jour » (US-206): this morning's offers, best score first. */
export const dailyPicks = (offers: QueueOffer[]) =>
  suggested(offers, (offer) => offer.daily === true);

export function newQueue(
  id: string,
  offers: QueueOffer[],
  budget: number,
): Queue {
  return {
    budget,
    id,
    items: offers.slice(0, MAX_QUEUE).map((offer) => ({
      applicationId: offer.applicationId ?? null,
      creditsSpent: 0,
      filledCount: 0,
      offer,
      reason: null,
      state: "waiting",
      step: null,
      tabId: offer.tabId ?? null,
    })),
    running: true,
    spent: 0,
    stopRequested: false,
  };
}

/** What the queue may still spend on one offer. */
export const remainingBudget = (queue: Queue) =>
  Math.max(0, queue.budget - queue.spent);

export type QueueSummary = Record<QueueItemState, number>;

export function summarize(queue: Queue): QueueSummary {
  const counts = {
    failed: 0,
    incomplete: 0,
    ready: 0,
    sent: 0,
    skipped: 0,
    "to-check": 0,
    waiting: 0,
    working: 0,
  } satisfies QueueSummary;
  for (const item of queue.items) counts[item.state] += 1;
  return counts;
}

export type QueueReport = { title: string; message: string };

const plural = (count: number, one: string, many: string) =>
  `${count} ${count > 1 ? many : one}`;

/** What a finished queue left the candidate (US-209): notification and panel. */
export function queueReport(queue: Queue): QueueReport {
  const counts = summarize(queue);
  const captchas = queue.items.filter(
    (item) => item.state === "incomplete" && item.captcha,
  ).length;
  const parts = [
    counts.ready && plural(counts.ready, "prête à envoyer", "prêtes à envoyer"),
    counts.incomplete - captchas &&
      plural(counts.incomplete - captchas, "à compléter", "à compléter"),
    captchas && plural(captchas, "captcha à résoudre", "captchas à résoudre"),
    counts.sent && plural(counts.sent, "envoyée", "envoyées"),
    counts["to-check"] &&
      plural(counts["to-check"], "envoi à vérifier", "envois à vérifier"),
    counts.skipped && plural(counts.skipped, "écartée", "écartées"),
    counts.failed && plural(counts.failed, "échec", "échecs"),
  ].filter(Boolean);
  const waiting = counts.ready + counts.incomplete;
  return {
    message: `${parts.join(" · ") || "Aucune offre traitée"} — ${plural(queue.spent, "crédit dépensé", "crédits dépensés")}.`,
    title: queue.stopRequested
      ? "File arrêtée"
      : waiting > 0
        ? `File terminée : ${plural(waiting, "candidature vous attend", "candidatures vous attendent")}`
        : "File terminée",
  };
}

/** A run cut short (service worker restarted): unfinished items failed. */
export function interrupted(queue: Queue): Queue {
  if (!queue.running) return queue;
  return {
    ...queue,
    items: queue.items.map((item) =>
      item.state === "working" || item.state === "waiting"
        ? {
            ...item,
            reason: "Interrompu : Chrome a arrêté l'extension.",
            state: "failed",
            step: null,
          }
        : item,
    ),
    running: false,
  };
}

/** An offer of `list_recent_offers` (MCP), the fields the queue reads. */
export type RecentOffer = {
  jobId: string;
  applyUrl: string | null;
  title: string;
  company: string;
  status: string | null;
  score?: number;
  applicationId: string | null;
};

type OpenTab = { tabId: number; title: string; url: string };
const DONE = new Set(["applied", "dismissed"]);

/**
 * This morning's offers first, then JobSpark's other recent offers, none
 * applied to or dismissed, then the candidate's open tabs; a tab already
 * showing a JobSpark offer is the same entry.
 */
export function mergeOffers(
  recent: RecentOffer[],
  tabs: OpenTab[],
  daily: RecentOffer[] = [],
): QueueOffer[] {
  const dailyIds = new Set(daily.map((offer) => offer.jobId));
  const offers: QueueOffer[] = [
    ...daily,
    ...recent.filter((offer) => !dailyIds.has(offer.jobId)),
  ]
    .filter((offer) => offer.applyUrl && !DONE.has(offer.status ?? ""))
    .map((offer) => ({
      applicationId: offer.applicationId,
      company: offer.company,
      ...(dailyIds.has(offer.jobId) ? { daily: true } : {}),
      key: offer.jobId,
      score: offer.score ?? null,
      source: "jobspark" as const,
      title: offer.title,
      url: offer.applyUrl!,
    }));
  for (const tab of tabs) {
    const same = offers.find(
      (offer) => normalizeOfferUrl(offer.url) === normalizeOfferUrl(tab.url),
    );
    if (same) {
      same.tabId = tab.tabId;
      continue;
    }
    offers.push({
      company: new URL(tab.url).host,
      key: `tab:${tab.tabId}`,
      source: "tab",
      tabId: tab.tabId,
      title: tab.title || tab.url,
      url: tab.url,
    });
  }
  return offers;
}
