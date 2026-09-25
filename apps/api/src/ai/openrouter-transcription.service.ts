import {
  NOOP_AI_USAGE_RECORDER,
  NO_USAGE,
  readUsage,
  recordUsage,
  type AiUsageRecorder,
} from "./ai-usage";
import { buildChain, runModelChain } from "./openrouter.chain";
import type { OpenRouterTranscriptionConfig } from "./openrouter-transcription.config";
import { buildOpenRouterError } from "./openrouter.error";
import { DEFAULT_RETRY_POLICY, type RetryHooks } from "./openrouter.retry";
import {
  TRANSCRIPTION_OPEN_TIMEOUT_MS,
  fetchWithOpenTimeout,
} from "./openrouter.timeout";

export interface TranscribeRequest {
  audioBase64: string;
  /** Container of the clip, e.g. `wav`. Tells the model how to decode bytes. */
  format: string;
  /** ISO-639-1 hint, e.g. `fr`. The endpoint takes it natively. */
  language?: string;
}

/** Containers OpenRouter's transcription endpoint decodes. */
const SUPPORTED_FORMATS = new Set([
  "wav",
  "mp3",
  "flac",
  "m4a",
  "ogg",
  "webm",
  "aac",
]);

/**
 * Speech-to-text over OpenRouter's dedicated `/audio/transcriptions` endpoint.
 *
 * It is deliberately not part of `OpenRouterService`: that one speaks
 * `/chat/completions`, where transcription used to live behind a JSON schema
 * and a token budget that silently truncated any answer past ~10 seconds.
 * Here the response is plain text, so there is no budget and nothing to parse.
 *
 * The endpoint applies no routing controls of its own — no `models[]`, no
 * `order`, no `allow_fallbacks` — so the fallback chain is walked here, by the
 * same `runModelChain` the chat path uses. See ADR-013.
 */
export class OpenRouterTranscriptionService {
  constructor(
    private readonly config: OpenRouterTranscriptionConfig,
    private readonly retryHooks: RetryHooks = {},
    private readonly usageRecorder: AiUsageRecorder = NOOP_AI_USAGE_RECORDER,
  ) {}

  /**
   * Returns the spoken text, or an empty string when the clip carries no
   * speech. Silence is not an error: the browser's voice detection trips on a
   * cough or a keyboard, and throwing there used to push a whole session into
   * `error` over nothing.
   */
  async transcribe(request: TranscribeRequest): Promise<string> {
    const chain = buildChain(this.config.model, this.config.fallbackModels);
    const startedAt = Date.now();
    let answeredBy = chain[0];
    const track = (payload: unknown, status: "ok" | "error") =>
      recordUsage(this.usageRecorder, {
        ...(readUsage(payload) ?? NO_USAGE),
        durationMs: Date.now() - startedAt,
        feature: "interview_transcription",
        fellBack: answeredBy !== chain[0],
        model: answeredBy,
        status,
      });

    const response = await runModelChain(
      chain,
      async (model) => {
        answeredBy = model;
        const attempt = await fetchWithOpenTimeout(
          `${this.config.baseUrl}/audio/transcriptions`,
          {
            body: JSON.stringify({
              model,
              input_audio: {
                data: request.audioBase64,
                format: normalizeFormat(request.format),
              },
              ...(request.language && { language: request.language }),
            }),
            headers: {
              Authorization: `Bearer ${this.config.apiKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://cvforge.app",
              "X-Title": "CVforge",
            },
            method: "POST",
          },
          TRANSCRIPTION_OPEN_TIMEOUT_MS,
          model,
        );

        if (!attempt.ok) {
          throw await buildOpenRouterError(
            attempt,
            "OpenRouter transcription failed",
            model,
          );
        }

        return attempt;
      },
      { ...DEFAULT_RETRY_POLICY, maxAttempts: this.config.maxAttempts },
      this.retryHooks,
    ).catch((error: unknown) => {
      track(null, "error");
      throw error;
    });

    const payload = (await response.json()) as { text?: unknown };
    track(payload, "ok");

    return typeof payload.text === "string" ? payload.text.trim() : "";
  }
}

/** `wav` is the fallback: it is what the studio uploads. */
function normalizeFormat(format: string): string {
  const normalized = format.trim().toLowerCase();

  return SUPPORTED_FORMATS.has(normalized) ? normalized : "wav";
}
