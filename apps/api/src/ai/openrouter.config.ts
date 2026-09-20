export interface OpenRouterConfig {
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
  /** Tried in order when every provider of `defaultModel` is exhausted. */
  fallbackModels: string[];
  maxAttempts: number;
  enableZdrChat: boolean;
  enableZdrStt: boolean;
}

/**
 * mistral-small-2603 is served by Mistral and nobody else, so OpenRouter's
 * shared pool throttling it left no way through — measured at 0 successes in
 * 18 attempts. This variant is the same family served by DeepInfra, Parasail
 * and Venice instead, which sidesteps that pool entirely, and it costs less.
 */
const DEFAULT_MODEL = "mistralai/mistral-small-3.2-24b-instruct";

/**
 * Ordered by grounding fidelity, measured on a CV whose offer demanded skills
 * the profile did not hold: gemini-2.5-flash drifted on 1 summary out of 4,
 * deepseek-v4-flash on 4 out of 4 — it never copies a forbidden word but
 * paraphrases the offer's themes onto the candidate, which is worse because a
 * lexical check misses it. DeepSeek stays last because at that point a
 * slightly oversold CV beats a 503.
 *
 * Any candidate needs several providers and structured-output support: a
 * single-provider fallback repeats the very trap this chain exists to escape.
 */
const DEFAULT_FALLBACK_MODELS = [
  "google/gemini-2.5-flash",
  "deepseek/deepseek-v4-flash",
];

const DEFAULT_MAX_ATTEMPTS = 3;

export function resolveOpenRouterConfig(): OpenRouterConfig {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY environment variable is required');
  return {
    apiKey,
    baseUrl: process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1',
    defaultModel: nonEmpty(process.env.OPENROUTER_MODEL) ?? DEFAULT_MODEL,
    fallbackModels: parseFallbackModels(process.env.OPENROUTER_FALLBACK_MODELS),
    maxAttempts: parseMaxAttempts(process.env.OPENROUTER_MAX_ATTEMPTS),
    enableZdrChat: process.env.ENABLE_ZDR_CHAT === 'true',
    enableZdrStt: process.env.ENABLE_ZDR_STT === 'true',
  };
}

/** `docker compose` turns an unset `${VAR:-}` into an empty string, so blank
 *  must mean "unset" everywhere, never "no value". */
function nonEmpty(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Comma-separated list. Blank falls back to the defaults (see `nonEmpty`);
 * the literal `none` is the explicit opt-out.
 */
function parseFallbackModels(raw: string | undefined): string[] {
  const value = nonEmpty(raw);
  if (value === undefined) return DEFAULT_FALLBACK_MODELS;
  if (value.toLowerCase() === 'none') return [];

  return value
    .split(',')
    .map((model) => model.trim())
    .filter((model) => model.length > 0);
}

function parseMaxAttempts(raw: string | undefined): number {
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) return DEFAULT_MAX_ATTEMPTS;
  return parsed;
}
