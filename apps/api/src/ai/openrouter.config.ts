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
 * Served by providers other than Mistral on purpose: an upstream throttle on
 * the shared Mistral pool must not take the whole extraction path down.
 */
const DEFAULT_FALLBACK_MODELS = ["google/gemini-2.5-flash", "openai/gpt-5-mini"];

const DEFAULT_MAX_ATTEMPTS = 3;

export function resolveOpenRouterConfig(): OpenRouterConfig {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY environment variable is required');
  return {
    apiKey,
    baseUrl: process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1',
    defaultModel: nonEmpty(process.env.OPENROUTER_MODEL) ?? 'mistralai/mistral-small-2603',
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
