export type MetricsConfig = {
  /**
   * Fixed rate, because revenue is in EUR cents and OpenRouter bills in USD.
   * A fixed rate keeps the margin reproducible and testable; the dashboard
   * says so rather than passing the figure off as exact.
   */
  usdToEurRate: number;
  /** The prepaid Claude credit to count down from; null when not declared. */
  anthropicCreditUsd: number | null;
};

const DEFAULT_USD_TO_EUR_RATE = 0.92;

function parsePositiveNumber(rawValue: string | undefined, fallback: number) {
  if (!rawValue) {
    return fallback;
  }

  const value = Number.parseFloat(rawValue);

  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function resolveMetricsConfig(env: NodeJS.ProcessEnv): MetricsConfig {
  const anthropicCreditUsd = parsePositiveNumber(env.ANTHROPIC_CREDIT_USD, 0);

  return {
    anthropicCreditUsd: anthropicCreditUsd > 0 ? anthropicCreditUsd : null,
    usdToEurRate: parsePositiveNumber(
      env.METRICS_USD_TO_EUR_RATE,
      DEFAULT_USD_TO_EUR_RATE,
    ),
  };
}
