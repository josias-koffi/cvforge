export interface OpenRouterBalanceConfig {
  /**
   * A **management** key, not the inference key: `GET /credits` answers 403 to
   * anything else. Empty when unset, which disables the service rather than
   * throwing — the API must still boot without balance supervision.
   */
  managementApiKey: string;
  baseUrl: string;
  /** Remaining credits below which the admin is alerted. */
  alertThreshold: number;
  /**
   * Remaining credits at or below which we stop selling credits we could not
   * honour. Defaults to 0 — a sale is refused only once the account is truly
   * empty, never on a merely low balance.
   */
  criticalThreshold: number;
}

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_ALERT_THRESHOLD = 5;
const DEFAULT_CRITICAL_THRESHOLD = 0;

function parsePositiveNumber(rawValue: string | undefined, fallback: number) {
  if (!rawValue) {
    return fallback;
  }

  const value = Number.parseFloat(rawValue);

  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/** Unlike the alert threshold, 0 is a meaningful value here — it is the default. */
function parseNonNegativeNumber(rawValue: string | undefined, fallback: number) {
  if (!rawValue) {
    return fallback;
  }

  const value = Number.parseFloat(rawValue);

  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export function resolveOpenRouterBalanceConfig(
  env: NodeJS.ProcessEnv,
): OpenRouterBalanceConfig {
  return {
    alertThreshold: parsePositiveNumber(
      env.OPENROUTER_BALANCE_ALERT_THRESHOLD,
      DEFAULT_ALERT_THRESHOLD,
    ),
    baseUrl: env.OPENROUTER_BASE_URL?.trim() || DEFAULT_BASE_URL,
    criticalThreshold: parseNonNegativeNumber(
      env.OPENROUTER_BALANCE_CRITICAL_THRESHOLD,
      DEFAULT_CRITICAL_THRESHOLD,
    ),
    managementApiKey: env.OPENROUTER_MANAGEMENT_API_KEY?.trim() ?? '',
  };
}
