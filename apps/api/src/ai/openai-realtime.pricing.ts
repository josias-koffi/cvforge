/**
 * What a Realtime call costs, from the `usage` the model reports on every
 * `response.done`.
 *
 * OpenAI returns tokens, never dollars, so the price list has to live here.
 * Dollars per million tokens, from the published list of 2026-09-25. Cached
 * input is what keeps a long interview affordable: each reply re-reads the
 * whole conversation, and all but the newest turn is a cache hit.
 */
type Rates = {
  textIn: number;
  cachedTextIn: number;
  audioIn: number;
  cachedAudioIn: number;
  textOut: number;
  audioOut: number;
};

const RATES: Record<string, Rates> = {
  "gpt-realtime-2.1": {
    audioIn: 32,
    audioOut: 64,
    cachedAudioIn: 0.4,
    cachedTextIn: 0.4,
    textIn: 4,
    textOut: 24,
  },
  "gpt-realtime-2.1-mini": {
    audioIn: 10,
    audioOut: 20,
    cachedAudioIn: 0.3,
    cachedTextIn: 0.06,
    textIn: 0.6,
    textOut: 2.4,
  },
};

/**
 * The candidate's transcription, dollars per million tokens. The GPT-4o
 * transcribers report tokens; Whisper reports a duration, billed by the minute.
 */
const TRANSCRIPTION_RATES: Record<string, { in: number; out: number }> = {
  "gpt-4o-mini-transcribe": { in: 1.25, out: 5 },
  "gpt-4o-transcribe": { in: 2.5, out: 10 },
};
const WHISPER_USD_PER_MINUTE = 0.006;

export type RealtimeUsage = {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

export const NO_REALTIME_USAGE: RealtimeUsage = {
  costUsd: 0,
  inputTokens: 0,
  outputTokens: 0,
};

function count(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : 0;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

/** Dated snapshots (`gpt-realtime-2.1-mini-2026-08-01`) price like their family. */
function ratesFor(model: string): Rates | null {
  const family = Object.keys(RATES)
    .sort((left, right) => right.length - left.length)
    .find((name) => model === name || model.startsWith(`${name}-`));

  return family ? RATES[family]! : null;
}

/**
 * One `response.done` usage block to tokens and dollars. An unknown model
 * still counts its tokens, at zero dollars, rather than inventing a price.
 */
export function priceResponseUsage(
  model: string,
  usage: unknown,
): RealtimeUsage {
  const raw = record(usage);
  const input = record(raw.input_token_details);
  const cached = record(input.cached_tokens_details);
  const output = record(raw.output_token_details);
  const rates = ratesFor(model);

  const inputTokens = count(raw.input_tokens);
  const outputTokens = count(raw.output_tokens);
  if (!rates) return { costUsd: 0, inputTokens, outputTokens };

  const cachedText = count(cached.text_tokens);
  const cachedAudio = count(cached.audio_tokens);
  const freshText = Math.max(0, count(input.text_tokens) - cachedText);
  const freshAudio = Math.max(0, count(input.audio_tokens) - cachedAudio);

  const costUsd =
    (freshText * rates.textIn +
      cachedText * rates.cachedTextIn +
      freshAudio * rates.audioIn +
      cachedAudio * rates.cachedAudioIn +
      count(output.text_tokens) * rates.textOut +
      count(output.audio_tokens) * rates.audioOut) /
    1_000_000;

  return { costUsd, inputTokens, outputTokens };
}

/** One transcription's `usage` to tokens and dollars, whichever shape it has. */
export function priceTranscriptionUsage(
  model: string,
  usage: unknown,
): RealtimeUsage {
  const raw = record(usage);
  if (raw.type === "duration") {
    return {
      ...NO_REALTIME_USAGE,
      costUsd: (count(raw.seconds) / 60) * WHISPER_USD_PER_MINUTE,
    };
  }

  const inputTokens = count(raw.input_tokens);
  const outputTokens = count(raw.output_tokens);
  const rates = TRANSCRIPTION_RATES[model];

  return {
    costUsd: rates
      ? (inputTokens * rates.in + outputTokens * rates.out) / 1_000_000
      : 0,
    inputTokens,
    outputTokens,
  };
}

export function addUsage(
  total: RealtimeUsage,
  next: RealtimeUsage,
): RealtimeUsage {
  return {
    costUsd: total.costUsd + next.costUsd,
    inputTokens: total.inputTokens + next.inputTokens,
    outputTokens: total.outputTokens + next.outputTokens,
  };
}
