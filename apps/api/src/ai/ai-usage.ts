import { Logger } from "@nestjs/common";
import type { AiBillingProvider, AiFeature } from "@cvforge/types";

/** One AI call as the cockpit counts it (US-154). */
export type AiUsageEvent = {
  feature: AiFeature;
  provider: AiBillingProvider;
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

/** What OpenRouter charged for a call, from the SDK's provider metadata. */
export function readCost(providerMetadata: unknown): number {
  const metadata = providerMetadata as
    | { openrouter?: { usage?: { cost?: unknown } } }
    | undefined;

  return count(metadata?.openrouter?.usage?.cost);
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
