import type { OpenRouterBalance } from "../ai/openrouter-balance.service";

export type OpenRouterBalanceResponse = {
  /** In OpenRouter credits (USD). */
  alertThreshold: number;
  /** `null` when supervision is off or the first read failed. */
  balance: OpenRouterBalance | null;
  isLowBalance: boolean;
  /** False when `OPENROUTER_MANAGEMENT_API_KEY` is unset. */
  supervisionEnabled: boolean;
};
