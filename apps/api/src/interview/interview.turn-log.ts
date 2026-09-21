import {
  formatTurnLog,
  type ChainTelemetry,
} from "../ai/openrouter.telemetry";

/** Just enough of Nest's logger to write a line, so tests need no container. */
export interface TurnLogSink {
  log: (message: string) => void;
}

export interface TurnLog {
  /** Called on every audio frame; only the first one counts. */
  markFirstAudio: () => void;
  onTelemetry: (telemetry: ChainTelemetry) => void;
  /** Writes the line. `transcriptionMs` is null when nothing was transcribed. */
  write: (transcriptionMs: number | null) => void;
}

/**
 * Times one turn and writes a single line about it when it ends.
 *
 * Latency measured in the browser is one number with no breakdown, so a turn
 * that fell back to a pricier model looked exactly like a slow one. This says
 * which model answered, how many attempts it took, and how much of the wait was
 * spent asleep in backoff.
 */
export function createTurnLog(
  sink: TurnLogSink,
  scope: string,
  sessionId: string,
  now: () => number = Date.now,
): TurnLog {
  const startedAt = now();
  let firstAudioMs: number | null = null;
  let telemetry: ChainTelemetry | null = null;

  return {
    markFirstAudio: () => {
      firstAudioMs ??= now() - startedAt;
    },
    onTelemetry: (next) => {
      telemetry = next;
    },
    write: (transcriptionMs) => {
      // No telemetry means the chain was never reached — a replayed chunk, or
      // an opening on a session already under way. Nothing worth a line.
      if (!telemetry) return;

      sink.log(
        JSON.stringify(
          formatTurnLog(scope, sessionId, telemetry, {
            firstAudioMs,
            totalMs: now() - startedAt,
            transcriptionMs,
          }),
        ),
      );
    },
  };
}
