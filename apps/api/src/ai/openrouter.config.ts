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
 * Ordered by grounding fidelity, measured on a CV whose target offer demanded
 * skills the profile did not hold: gpt-4.1-nano drifted on 0 summaries out of
 * 4, gemini-2.5-flash on 1. Each entry also sits on a different provider
 * family — DeepInfra/Parasail/Venice, then Azure/OpenAI, then Google — so no
 * single upstream outage can empty the chain.
 *
 * deepseek-v4-flash is deliberately absent despite being the cheapest of all:
 * it drifted on 4 summaries out of 4, never copying a forbidden word but
 * paraphrasing the offer's themes onto the candidate. A lexical check misses
 * that entirely, and a CV claiming experience its owner never had is worse
 * than an error page.
 */
const DEFAULT_FALLBACK_MODELS = [
  "openai/gpt-4.1-nano",
  "google/gemini-2.5-flash",
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
