import { describe, expect, it } from "vitest";
import {
  formatTurnLog,
  summarizeAttempts,
  type ChainAttempt,
} from "./openrouter.telemetry";

const served = (model: string, durationMs = 900): ChainAttempt => ({
  durationMs,
  failed: false,
  model,
  status: 200,
});

const throttled = (model: string, durationMs = 120): ChainAttempt => ({
  durationMs,
  failed: true,
  model,
  status: 429,
});

describe("summarizeAttempts", () => {
  it("names the model that answered on a clean first try", () => {
    expect(summarizeAttempts([served("openai/gpt-audio-mini")])).toEqual({
      attempts: 1,
      callMs: 900,
      fellBack: false,
      model: "openai/gpt-audio-mini",
      modelsTried: ["openai/gpt-audio-mini"],
    });
  });

  it("flags a fall back, which used to look just like a slow primary", () => {
    const telemetry = summarizeAttempts([
      throttled("openai/gpt-audio-mini"),
      throttled("openai/gpt-audio-mini"),
      served("openai/gpt-audio", 700),
    ]);

    expect(telemetry.model).toBe("openai/gpt-audio");
    expect(telemetry.fellBack).toBe(true);
    expect(telemetry.attempts).toBe(3);
    expect(telemetry.modelsTried).toEqual([
      "openai/gpt-audio-mini",
      "openai/gpt-audio",
    ]);
  });

  it("reports no model when the whole chain failed", () => {
    const telemetry = summarizeAttempts([
      throttled("a/one"),
      throttled("b/two"),
    ]);

    expect(telemetry.model).toBeNull();
    expect(telemetry.fellBack).toBe(true);
  });

  it("counts retries on one model as one model tried", () => {
    const telemetry = summarizeAttempts([
      throttled("a/one"),
      served("a/one"),
    ]);

    expect(telemetry.attempts).toBe(2);
    expect(telemetry.fellBack).toBe(false);
  });

  it("adds up the time spent inside the calls", () => {
    expect(
      summarizeAttempts([throttled("a/one", 120), served("a/one", 880)]).callMs,
    ).toBe(1000);
  });

  it("says nothing happened rather than throwing on an empty run", () => {
    expect(summarizeAttempts([])).toEqual({
      attempts: 0,
      callMs: 0,
      fellBack: false,
      model: null,
      modelsTried: [],
    });
  });

  it("times an attempt that never got a reply", () => {
    // A socket failure has no status, and it still cost four seconds.
    const dead: ChainAttempt = { durationMs: 4000, failed: true, model: "a/one" };

    expect(summarizeAttempts([dead, served("b/two")]).callMs).toBe(4900);
  });
});

describe("formatTurnLog", () => {
  const telemetry = summarizeAttempts([
    throttled("openai/gpt-audio-mini", 100),
    served("openai/gpt-audio", 800),
  ]);

  it("flattens one turn into one searchable object", () => {
    expect(
      formatTurnLog("interview.turn", "s1", telemetry, {
        firstAudioMs: 1400,
        totalMs: 2600,
        transcriptionMs: 900,
        transcriptionWaitMs: 200,
      }),
    ).toEqual({
      attempts: 2,
      callMs: 900,
      event: "interview.turn",
      fellBack: true,
      firstAudioMs: 1400,
      model: "openai/gpt-audio",
      modelsTried: "openai/gpt-audio-mini,openai/gpt-audio",
      sessionId: "s1",
      totalMs: 2600,
      transcriptionMs: 900,
      transcriptionWaitMs: 200,
      waitedMs: 1700,
    });
  });

  it("keeps the time outside the call non-negative, whatever the clocks did", () => {
    const log = formatTurnLog("interview.turn", "s1", telemetry, {
      firstAudioMs: 900,
      totalMs: 900,
      transcriptionMs: null,
      transcriptionWaitMs: null,
    });

    expect(log.waitedMs).toBe(0);
  });

  it("reports the transcription's own duration, not the turn's", () => {
    // The first version subtracted the turn's start instead of the call's, so
    // this number always equalled totalMs and answered nothing.
    const log = formatTurnLog("interview.turn", "s1", telemetry, {
      firstAudioMs: 400,
      totalMs: 2600,
      transcriptionMs: 700,
      transcriptionWaitMs: 0,
    });

    expect(log.transcriptionMs).toBe(700);
    expect(log.transcriptionMs).not.toBe(log.totalMs);
  });

  it("says a transcription running beside the voice cost the turn nothing", () => {
    const log = formatTurnLog("interview.turn", "s1", telemetry, {
      firstAudioMs: 400,
      totalMs: 2600,
      transcriptionMs: 1900,
      transcriptionWaitMs: 0,
    });

    expect(log.transcriptionWaitMs).toBe(0);
  });

  it("keeps a turn that produced no audio loggable", () => {
    const log = formatTurnLog("interview.opening", "s1", summarizeAttempts([]), {
      firstAudioMs: null,
      totalMs: 40,
      transcriptionMs: null,
      transcriptionWaitMs: null,
    });

    expect(log.firstAudioMs).toBeNull();
    expect(log.model).toBeNull();
  });
});
