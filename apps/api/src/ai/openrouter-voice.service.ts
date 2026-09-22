import { buildChain, runModelChain } from "./openrouter.chain";
import type { OpenRouterVoiceConfig } from "./openrouter-voice.config";
import { OpenRouterRequestError, buildOpenRouterError } from "./openrouter.error";
import { VOICE_RETRY_POLICY, type RetryHooks } from "./openrouter.retry";
import {
  VOICE_OPEN_TIMEOUT_MS,
  fetchWithOpenTimeout,
} from "./openrouter.timeout";
import {
  summarizeAttempts,
  type ChainAttempt,
  type ChainTelemetry,
} from "./openrouter.telemetry";

export interface VoiceTurnRequest {
  /** What the interviewer is and how it should behave. */
  systemPrompt: string;
  /** The conversation so far, as text — cheaper than replaying the audio. */
  history: Array<{ role: "user" | "assistant"; content: string }>;
  /** The candidate's latest answer. Absent when the interviewer opens. */
  audio?: { base64: string; format: string };
  /**
   * Sent in place of audio to make the interviewer speak first. The model
   * still answers with voice; only the prompt differs.
   */
  instruction?: string;
  /**
   * Called once the stream is open, with what the chain had to do to open it.
   * Optional: nothing about the turn depends on anyone listening.
   */
  onTelemetry?: (telemetry: ChainTelemetry) => void;
}

export type VoiceTurnEvent =
  /** Raw PCM16 to play, base64-encoded, in arrival order. */
  | { type: "audio"; data: string }
  /** What the interviewer is saying, as it is spoken. */
  | { type: "transcript"; text: string };

/**
 * One interview turn as a single speech-to-speech call.
 *
 * This replaces transcribe → chat → speak, three round trips whose latencies
 * added up to six to eight seconds. Measured here at ~1.1s to the first
 * audible word, with a natural voice instead of the browser's synthesiser.
 *
 * The audio only ever goes one way in this design: OpenRouter is
 * request/response, with no bidirectional socket, so the candidate cannot
 * interrupt the interviewer. That needs a realtime API and is a separate
 * decision — see docs/interview-practice.md.
 */
export class OpenRouterVoiceService {
  constructor(
    private readonly config: OpenRouterVoiceConfig,
    private readonly retryHooks: RetryHooks = {},
  ) {}

  /**
   * Streams the spoken reply. Yields as the model speaks rather than
   * returning at the end: the first chunk is what the candidate hears, and
   * waiting for the last one would put the whole generation into the silence.
   */
  async *streamTurn(
    request: VoiceTurnRequest,
  ): AsyncGenerator<VoiceTurnEvent, void, undefined> {
    const response = await this.openStream(request);
    const body = response.body;
    if (!body) throw new Error("OpenRouter voice reply had no body");

    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        // The tail is whatever precedes the next newline: hold it back.
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const event = parseFrame(line);
          if (event) yield event;
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private async openStream(request: VoiceTurnRequest) {
    const chain = buildChain(this.config.model, this.config.fallbackModels);
    // Recorded here rather than inside `runModelChain`: this closure is the
    // only place that knows when one call starts and ends.
    const attempts: ChainAttempt[] = [];

    try {
      return await this.runChain(chain, request, attempts);
    } finally {
      request.onTelemetry?.(summarizeAttempts(attempts));
    }
  }

  private runChain(
    chain: string[],
    request: VoiceTurnRequest,
    attempts: ChainAttempt[],
  ) {
    return runModelChain(
      chain,
      async (model) => {
        const startedAt = Date.now();
        const record: ChainAttempt = { durationMs: 0, failed: true, model };
        attempts.push(record);

        let attempt: Response;
        try {
          attempt = await this.callModel(model, request);
        } catch (error) {
          // Kept so the turn log can name what went wrong. `withRetry` swallows
          // a retried failure whole, which is why a 34-second dead connection
          // showed up as nothing but `attempts: 2`.
          if (error instanceof OpenRouterRequestError) record.status = error.status;
          throw error;
        } finally {
          // Timed in a finally so a socket failure is measured too: a call
          // that dies after four seconds is the one worth seeing in the log.
          record.durationMs = Date.now() - startedAt;
        }

        record.status = attempt.status;

        if (!attempt.ok) {
          throw await buildOpenRouterError(
            attempt,
            "OpenRouter voice turn failed",
            model,
          );
        }

        record.failed = false;

        return attempt;
      },
      { ...VOICE_RETRY_POLICY, maxAttempts: this.config.maxAttempts },
      this.retryHooks,
    );
  }

  private callModel(model: string, request: VoiceTurnRequest) {
    return fetchWithOpenTimeout(
      `${this.config.baseUrl}/chat/completions`,
      {
        body: JSON.stringify({
          model,
          // Audio output is only served over SSE, never in one payload.
          stream: true,
          modalities: ["text", "audio"],
          audio: { voice: this.config.voice, format: "pcm16" },
          max_completion_tokens: this.config.maxTokens,
          messages: [
            { role: "system", content: request.systemPrompt },
            ...request.history,
            userMessage(request),
          ],
        }),
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://cvforge.app",
          "X-Title": "CVforge",
        },
        method: "POST",
      },
      VOICE_OPEN_TIMEOUT_MS,
      model,
    );
  }
}

/**
 * The candidate's side of the exchange: their recorded answer, or — on the
 * opening turn, when they have not spoken yet — the instruction that makes the
 * interviewer break the silence itself.
 */
function userMessage(request: VoiceTurnRequest) {
  if (!request.audio) {
    return { role: "user" as const, content: request.instruction ?? "" };
  }

  return {
    role: "user" as const,
    content: [
      {
        type: "input_audio",
        input_audio: {
          data: request.audio.base64,
          format: normalizeFormat(request.audio.format),
        },
      },
    ],
  };
}

const SUPPORTED_FORMATS = new Set(["wav", "mp3", "flac", "m4a", "ogg", "webm"]);

function normalizeFormat(format: string) {
  const normalized = format.trim().toLowerCase();

  return SUPPORTED_FORMATS.has(normalized) ? normalized : "wav";
}

/** One SSE line to an event, or null for anything not worth surfacing. */
function parseFrame(line: string): VoiceTurnEvent | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return null;

  const payload = trimmed.slice(5).trim();
  if (payload.length === 0 || payload === "[DONE]") return null;

  try {
    const parsed = JSON.parse(payload) as {
      choices?: Array<{
        delta?: { audio?: { data?: string; transcript?: string } };
      }>;
    };
    const audio = parsed.choices?.[0]?.delta?.audio;

    if (audio?.data) return { type: "audio", data: audio.data };
    if (audio?.transcript) return { type: "transcript", text: audio.transcript };
  } catch {
    // A malformed frame is skipped rather than ending the turn.
  }

  return null;
}
