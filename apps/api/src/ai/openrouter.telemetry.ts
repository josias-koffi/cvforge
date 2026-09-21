/**
 * What a model chain actually did, for the log line after the fact.
 *
 * `runModelChain`'s own comment says the failover "has to be ours to be
 * observable" — but nothing recorded it, so a fall back to a pricier model was
 * indistinguishable from the primary being slow. On a voice turn that is the
 * difference between "the provider throttled us" and "the model is just like
 * that", and only one of those is worth acting on.
 */

/** One HTTP call to one model. */
export interface ChainAttempt {
  model: string;
  /** Wall time of the call itself, failures included. */
  durationMs: number;
  /** Absent when the call never got a reply — DNS, socket, timeout. */
  status?: number;
  failed: boolean;
}

export interface ChainTelemetry {
  /** The model that answered, or null when every one of them failed. */
  model: string | null;
  attempts: number;
  modelsTried: string[];
  /** True when the primary did not serve the turn. */
  fellBack: boolean;
  /** Time spent inside the calls; the gap to `totalMs` is backoff. */
  callMs: number;
}

export function summarizeAttempts(attempts: ChainAttempt[]): ChainTelemetry {
  const served = attempts.at(-1);
  const modelsTried = [...new Set(attempts.map((attempt) => attempt.model))];

  return {
    attempts: attempts.length,
    callMs: attempts.reduce((total, attempt) => total + attempt.durationMs, 0),
    fellBack: modelsTried.length > 1,
    model: served && !served.failed ? served.model : null,
    modelsTried,
  };
}

/** Everything the turn measured, beside what the chain did. */
export interface TurnTimings {
  /** Request start to the first byte of audio — what the candidate waits for. */
  firstAudioMs: number | null;
  totalMs: number;
  transcriptionMs: number | null;
}

/**
 * One JSON object per turn, per the logging standard. Flat on purpose: a log
 * search for a slow turn should not have to walk nested objects.
 */
export function formatTurnLog(
  scope: string,
  sessionId: string,
  telemetry: ChainTelemetry,
  timings: TurnTimings,
): Record<string, unknown> {
  return {
    attempts: telemetry.attempts,
    callMs: telemetry.callMs,
    event: scope,
    fellBack: telemetry.fellBack,
    firstAudioMs: timings.firstAudioMs,
    model: telemetry.model,
    modelsTried: telemetry.modelsTried.join(","),
    sessionId,
    totalMs: timings.totalMs,
    transcriptionMs: timings.transcriptionMs,
    // The gap between the two is time spent asleep in backoff, which is the
    // number worth alerting on.
    waitedMs: Math.max(0, timings.totalMs - telemetry.callMs),
  };
}
