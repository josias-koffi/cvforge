import type { OpenRouterBalance } from "../ai/openrouter-balance.service";

export const METRICS_STORE = Symbol("METRICS_STORE");

/** Raw counters, straight from SQL. No currency conversion, no derivation. */
export type ProductCounters = {
  activeUserCount: number;
  applicationCount: number;
  creditsConsumed: number;
  creditsGranted: number;
  creditsSold: number;
  cvImportCount: number;
  generatedCvCount: number;
  generatedLetterCount: number;
  grossRevenueCents: number;
  interviewCompletedCount: number;
  interviewCount: number;
  offerEnrichmentCount: number;
  paidOrderCount: number;
  totalAdminCount: number;
  totalUserCount: number;
};

export type MetricsStore = {
  readProductCounters: (activeWindowDays: number) => Promise<ProductCounters>;
};

export type AdminMetrics = {
  generatedAt: string;
  activeWindowDays: number;
  documents: {
    cvImportCount: number;
    generatedCvCount: number;
    generatedLetterCount: number;
    offerEnrichmentCount: number;
  };
  interviews: { completedCount: number; totalCount: number };
  users: { activeCount: number; adminCount: number; totalCount: number };
  applications: { totalCount: number };
  credits: { consumed: number; granted: number; sold: number };
  revenue: { currency: "eur"; grossCents: number; paidOrderCount: number };
  /**
   * `null` when supervision is off or the balance is unreadable — the only
   * source of API spend we have. OpenRouter reports usage **since the account
   * was created**, so cost and margin are all-time figures, never per period.
   */
  apiCost: {
    estimatedEurCents: number;
    stale: boolean;
    usdToEurRate: number;
    usedUsd: number;
  } | null;
  /** `null` whenever `apiCost` is, since it cannot be derived without it. */
  margin: { netEurCents: number; ratio: number | null } | null;
};

export type OpenRouterBalanceResponse = {
  /** In OpenRouter credits (USD). */
  alertThreshold: number;
  /** `null` when supervision is off or the first read failed. */
  balance: OpenRouterBalance | null;
  isLowBalance: boolean;
  /** False when `OPENROUTER_MANAGEMENT_API_KEY` is unset. */
  supervisionEnabled: boolean;
};
