import { nonEmpty, parseMaxAttempts, parseModelList } from "./openrouter.env";

export interface OpenRouterTranscriptionConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  /** Tried in order when every provider of `model` is exhausted. */
  fallbackModels: string[];
  maxAttempts: number;
}

/**
 * Whisper Turbo leads on price: $0.012/h of audio against $0.18/h for the
 * voxtral-small this replaces — the same fifteenfold gap at every rung of the
 * chain. It is also the reference multilingual model, which matters because
 * candidates rehearse in French.
 *
 * The two models originally picked for this chain — voxtral-mini-transcribe
 * and qwen3-asr-flash — are unreachable on our account: OpenRouter rejects
 * them with "ZDR violation (account settings)", a per-account privacy rule no
 * request-level flag overrides. That is almost certainly why interview
 * transcription never worked reliably: the pinned Voxtral had no route at all.
 * Measured 2026-09-21; see ADR-013.
 */
const DEFAULT_MODEL = "openai/whisper-large-v3-turbo";

/**
 * Each entry sits on a different provider family — OpenAI-lineage weights
 * served by a third party, then Mistral, then NVIDIA — so no single upstream
 * outage can empty the chain. Both were verified reachable under this
 * account's privacy settings, unlike most of the catalogue.
 */
const DEFAULT_FALLBACK_MODELS = [
  "mistralai/voxtral-mini-3b-2507",
  "nvidia/nemotron-3.5-asr-streaming-multilingual-0.6b",
];

const DEFAULT_MAX_ATTEMPTS = 3;

export function resolveTranscriptionConfig(): OpenRouterTranscriptionConfig {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is required");
  }

  return {
    apiKey,
    baseUrl:
      nonEmpty(process.env.OPENROUTER_BASE_URL) ??
      "https://openrouter.ai/api/v1",
    model: nonEmpty(process.env.INTERVIEW_STT_MODEL) ?? DEFAULT_MODEL,
    fallbackModels: parseModelList(
      process.env.INTERVIEW_STT_FALLBACK_MODELS,
      DEFAULT_FALLBACK_MODELS,
    ),
    maxAttempts: parseMaxAttempts(
      process.env.OPENROUTER_MAX_ATTEMPTS,
      DEFAULT_MAX_ATTEMPTS,
    ),
  };
}
