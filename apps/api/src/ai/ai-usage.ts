import { Logger } from "@nestjs/common";
import type { AiFeature } from "@cvforge/types";

/** One AI call as the cockpit counts it (US-154). */
export type AiUsageEvent = {
  feature: AiFeature;
  model: string;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  durationMs: number;
  status: "ok" | "error";
  fellBack: boolean;
};

export interface AiUsageRecorder {
  record(event: AiUsageEvent): Promise<void>;
}

/** For tests and scripts that have no database: counts nothing. */
export const NOOP_AI_USAGE_RECORDER: AiUsageRecorder = {
  record: async () => undefined,
};

export type UsageFigures = Pick<
  AiUsageEvent,
  "promptTokens" | "completionTokens" | "costUsd"
>;

export const NO_USAGE: UsageFigures = {
  completionTokens: 0,
  costUsd: 0,
  promptTokens: 0,
};

function count(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : 0;
}

/**
 * OpenRouter's `usage` object to our figures, or null when the payload has
 * none. OpenRouter always sends it — on the body of a completion, on the last
 * chunk of a stream — and `cost` is what the account is actually charged.
 */
export function readUsage(payload: unknown): UsageFigures | null {
  if (!payload || typeof payload !== "object") return null;
  const usage = (payload as { usage?: unknown }).usage;
  if (!usage || typeof usage !== "object") return null;
  const raw = usage as Record<string, unknown>;

  return {
    completionTokens: Math.round(count(raw.completion_tokens)),
    costUsd: count(raw.cost),
    promptTokens: Math.round(count(raw.prompt_tokens)),
  };
}

/** The same, from one SSE line; null for any line that carries no usage. */
export function readUsageFrame(line: string): UsageFigures | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return null;
  const payload = trimmed.slice(5).trim();
  if (!payload.includes('"usage"')) return null;

  try {
    return readUsage(JSON.parse(payload));
  } catch {
    return null;
  }
}

const logger = new Logger("AiUsage");

/**
 * Fire and forget. Counting what a call cost must never be the reason the call
 * fails: the candidate paid for a CV, not for our bookkeeping.
 */
export function recordUsage(recorder: AiUsageRecorder, event: AiUsageEvent) {
  recorder.record(event).catch((error: unknown) => {
    logger.warn(
      `AI usage not recorded (${event.feature}): ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  });
}
