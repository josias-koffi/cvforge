import { nonEmpty, parsePositiveInt, parseModelList } from "./openrouter.env";

export interface OpenRouterVoiceConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  fallbackModels: string[];
  /** One of the provider's preset voices. */
  voice: string;
  maxAttempts: number;
  /** Caps the reply: an interviewer asks one question, it does not lecture. */
  maxTokens: number;
}

/**
 * Measured on a real French interview turn, 2026-09-21:
 *
 * | model          | first audio | cost/turn  |
 * |----------------|-------------|------------|
 * | gpt-audio-mini | 1129 ms     | $0.00044   |
 * | gpt-audio      |  751 ms     | $0.00822   |
 *
 * The mini is nineteen times cheaper for 378 ms more, which keeps a session
 * at roughly half a euro cent — cheaper than the transcribe/chat/speak
 * pipeline it replaces, and far cheaper than a realtime API. Both need the
 * `openai` provider enabled in the account's allowed-providers list.
 */
const DEFAULT_MODEL = "openai/gpt-audio-mini";

/** Only gpt-audio serves the same contract, so the chain is short by nature. */
const DEFAULT_FALLBACK_MODELS = ["openai/gpt-audio"];

const DEFAULT_VOICE = "alloy";
const DEFAULT_MAX_ATTEMPTS = 2;
const DEFAULT_MAX_TOKENS = 400;

export function resolveVoiceConfig(): OpenRouterVoiceConfig {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is required");
  }

  return {
    apiKey,
    baseUrl:
      nonEmpty(process.env.OPENROUTER_BASE_URL) ??
      "https://openrouter.ai/api/v1",
    model: nonEmpty(process.env.INTERVIEW_VOICE_MODEL) ?? DEFAULT_MODEL,
    fallbackModels: parseModelList(
      process.env.INTERVIEW_VOICE_FALLBACK_MODELS,
      DEFAULT_FALLBACK_MODELS,
    ),
    voice: nonEmpty(process.env.INTERVIEW_VOICE) ?? DEFAULT_VOICE,
    // Deliberately not OPENROUTER_MAX_ATTEMPTS: that one is set to 3 in every
    // compose file and was silently overriding the voice budget, giving three
    // attempts on each of two models — six round trips while the candidate
    // waits.
    maxAttempts: parsePositiveInt(
      process.env.INTERVIEW_VOICE_MAX_ATTEMPTS,
      DEFAULT_MAX_ATTEMPTS,
    ),
    maxTokens: parsePositiveInt(
      process.env.INTERVIEW_VOICE_MAX_TOKENS,
      DEFAULT_MAX_TOKENS,
    ),
  };
}
