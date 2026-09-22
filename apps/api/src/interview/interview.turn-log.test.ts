import { describe, expect, it, vi } from "vitest";
import type { ChainTelemetry } from "../ai/openrouter.telemetry";
import { createTurnLog } from "./interview.turn-log";

const TELEMETRY: ChainTelemetry = {
  attempts: 2,
  callMs: 900,
  failures: [],
  fellBack: true,
  model: "openai/gpt-audio",
  modelsTried: ["openai/gpt-audio-mini", "openai/gpt-audio"],
};

/** A clock the test advances by hand, so timings are exact. */
function fakeClock(start = 1_000) {
  let current = start;

  return {
    advance: (ms: number) => {
      current += ms;
    },
    now: () => current,
  };
}

function setup(scope = "interview.turn") {
  const clock = fakeClock();
  const sink = { log: vi.fn() };
  const log = createTurnLog(sink, scope, "s1", clock.now);

  return { clock, log, sink };
}

/** The single JSON line the sink was handed. */
function written(sink: { log: ReturnType<typeof vi.fn> }) {
  return JSON.parse(String(sink.log.mock.calls[0]?.[0])) as Record<
    string,
    unknown
  >;
}

describe("createTurnLog", () => {
  it("names the model that answered and how long it took to speak", () => {
    const { clock, log, sink } = setup();

    log.onTelemetry(TELEMETRY);
    clock.advance(1400);
    log.markFirstAudio();
    clock.advance(600);
    log.write({ durationMs: 800, waitedMs: 150 });

    expect(written(sink)).toMatchObject({
      attempts: 2,
      event: "interview.turn",
      fellBack: true,
      firstAudioMs: 1400,
      model: "openai/gpt-audio",
      sessionId: "s1",
      totalMs: 2000,
      transcriptionMs: 800,
      transcriptionWaitMs: 150,
    });
  });

  it("times the first frame, not the last", () => {
    const { clock, log, sink } = setup();

    log.onTelemetry(TELEMETRY);
    clock.advance(900);
    log.markFirstAudio();
    clock.advance(3000);
    log.markFirstAudio();
    log.write();

    expect(written(sink).firstAudioMs).toBe(900);
  });

  it("separates the time outside the voice call from the time spent in it", () => {
    // Backoff lives in here, but so does the wait on transcription: read it
    // with `attempts` and `transcriptionWaitMs` beside it.
    const { clock, log, sink } = setup();

    log.onTelemetry(TELEMETRY);
    clock.advance(2500);
    log.write();

    expect(written(sink).waitedMs).toBe(1600);
  });

  it("writes nothing when the model chain was never reached", () => {
    // A replayed chunk, or an opening on a session already under way.
    const { log, sink } = setup();

    log.write();

    expect(sink.log).not.toHaveBeenCalled();
  });

  it("still writes a line for a turn that failed before any audio", () => {
    const { clock, log, sink } = setup();

    log.onTelemetry({ ...TELEMETRY, model: null });
    clock.advance(400);
    log.write();

    expect(written(sink)).toMatchObject({
      firstAudioMs: null,
      model: null,
      transcriptionMs: null,
    });
  });

  it("carries the scope, so an opening is searchable apart from a turn", () => {
    const { log, sink } = setup("interview.opening");

    log.onTelemetry(TELEMETRY);
    log.write();

    expect(written(sink).event).toBe("interview.opening");
  });

  it("writes one line per turn, whatever happened during it", () => {
    const { log, sink } = setup();

    log.onTelemetry(TELEMETRY);
    log.markFirstAudio();
    log.write({ durationMs: 10, waitedMs: 0 });

    expect(sink.log).toHaveBeenCalledTimes(1);
  });
});
