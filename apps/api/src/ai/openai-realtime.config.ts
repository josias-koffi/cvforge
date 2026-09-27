import { nonEmpty, parsePositiveInt } from "./openrouter.env";

/** How eagerly semantic turn detection hands the floor to the recruiter. */
export type RealtimeEagerness = "low" | "medium" | "high" | "auto";

/** `far_field` suits a laptop's own microphone, `near_field` a headset. */
export type RealtimeNoiseReduction = "near_field" | "far_field" | "off";

/**
 * `semantic` hears that a sentence is finished; `server` is a plain
 * loudness detector with a threshold, for a room too noisy for the first.
 */
export type RealtimeTurnDetection = "semantic" | "server";

export interface OpenAiRealtimeConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  /** One of the Realtime preset voices. */
  voice: string;
  /** Transcribes the candidate for the report; the voice itself never waits on it. */
  transcriptionModel: string;
  eagerness: RealtimeEagerness;
  noiseReduction: RealtimeNoiseReduction;
  turnDetection: RealtimeTurnDetection;
  /** Server detection only: how loud speech must be, 0-1. */
  vadThreshold: number;
  /** Server detection only: the silence that ends a turn. */
  vadSilenceMs: number;
  /**
   * A ceiling against a runaway reply, not the way replies are kept short —
   * the prompt does that. It counts *audio* tokens, about twenty a second of
   * speech plus the transcript: at 400 the recruiter was cut off mid-word
   * after fifteen seconds.
   */
  maxOutputTokens: number;
}

/**
 * Speech-to-speech over WebRTC, straight between the browser and OpenAI
 * (ADR-026). The mini is the only tier the credit price carries: about
 * $0.02-0.03 a minute against $0.05-0.10 for the full model, measured on the
 * price list of 2026-09-25.
 */
const DEFAULT_MODEL = "gpt-realtime-2.1-mini";

/** The two voices tuned for Realtime; `alloy` is the flattest of the set. */
const DEFAULT_VOICE = "marin";

const DEFAULT_TRANSCRIPTION_MODEL = "gpt-4o-mini-transcribe";
const DEFAULT_MAX_OUTPUT_TOKENS = 1_500;

const EAGERNESS: readonly RealtimeEagerness[] = ["low", "medium", "high", "auto"];
const NOISE_REDUCTION: readonly RealtimeNoiseReduction[] = [
  "near_field",
  "far_field",
  "off",
];
const TURN_DETECTION: readonly RealtimeTurnDetection[] = ["semantic", "server"];

/**
 * Most candidates sit in front of a laptop, whose microphone hears the room:
 * with `near_field`, a chair or a keyboard was enough to cut the recruiter off.
 */
const DEFAULT_NOISE_REDUCTION: RealtimeNoiseReduction = "far_field";
/**
 * Above OpenAI's 0.5, so a noise in the room does not read as speech. Tried
 * live on 2026-09-25: semantic detection took five noises in one interview
 * for the candidate, each cutting the recruiter off and paying for a reply;
 * `server` at 0.8 took one.
 */
const DEFAULT_TURN_DETECTION: RealtimeTurnDetection = "server";
const DEFAULT_VAD_THRESHOLD = 0.8;
const DEFAULT_VAD_SILENCE_MS = 700;

function parseChoice<T extends string>(
  raw: string | undefined,
  choices: readonly T[],
  fallback: T,
): T {
  const value = nonEmpty(raw)?.toLowerCase();

  return choices.find((choice) => choice === value) ?? fallback;
}

function parseThreshold(raw: string | undefined): number {
  const value = Number(nonEmpty(raw));

  return Number.isFinite(value) && value > 0 && value < 1
    ? value
    : DEFAULT_VAD_THRESHOLD;
}

export function resolveOpenAiRealtimeConfig(
  env: NodeJS.ProcessEnv = process.env,
): OpenAiRealtimeConfig {
  const apiKey = nonEmpty(env.OPENAI_API_KEY);
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is required");
  }

  return {
    apiKey,
    baseUrl: nonEmpty(env.OPENAI_BASE_URL) ?? "https://api.openai.com/v1",
    eagerness: parseChoice(env.INTERVIEW_REALTIME_EAGERNESS, EAGERNESS, "medium"),
    maxOutputTokens: parsePositiveInt(
      env.INTERVIEW_REALTIME_MAX_OUTPUT_TOKENS,
      DEFAULT_MAX_OUTPUT_TOKENS,
    ),
    model: nonEmpty(env.INTERVIEW_REALTIME_MODEL) ?? DEFAULT_MODEL,
    noiseReduction: parseChoice(
      env.INTERVIEW_REALTIME_NOISE_REDUCTION,
      NOISE_REDUCTION,
      DEFAULT_NOISE_REDUCTION,
    ),
    transcriptionModel:
      nonEmpty(env.INTERVIEW_REALTIME_TRANSCRIPTION_MODEL) ??
      DEFAULT_TRANSCRIPTION_MODEL,
    turnDetection: parseChoice(
      env.INTERVIEW_REALTIME_TURN_DETECTION,
      TURN_DETECTION,
      DEFAULT_TURN_DETECTION,
    ),
    vadSilenceMs: parsePositiveInt(
      env.INTERVIEW_REALTIME_VAD_SILENCE_MS,
      DEFAULT_VAD_SILENCE_MS,
    ),
    vadThreshold: parseThreshold(env.INTERVIEW_REALTIME_VAD_THRESHOLD),
    voice: nonEmpty(env.INTERVIEW_REALTIME_VOICE) ?? DEFAULT_VOICE,
  };
}
