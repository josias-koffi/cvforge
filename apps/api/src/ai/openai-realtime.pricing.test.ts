import { describe, expect, it } from "vitest";
import {
  priceResponseUsage,
  priceTranscriptionUsage,
} from "./openai-realtime.pricing";

const USAGE = {
  input_token_details: {
    audio_tokens: 1_000,
    cached_tokens_details: { audio_tokens: 400, text_tokens: 1_000 },
    text_tokens: 2_000,
  },
  input_tokens: 3_000,
  output_token_details: { audio_tokens: 500, text_tokens: 50 },
  output_tokens: 550,
};

describe("priceResponseUsage", () => {
  it("prices fresh and cached input apart, audio and text apart", () => {
    const usage = priceResponseUsage("gpt-realtime-2.1-mini", USAGE);

    // 1000 fresh text × 0.6 + 1000 cached text × 0.06 + 600 fresh audio × 10
    // + 400 cached audio × 0.3 + 50 text out × 2.4 + 500 audio out × 20.
    const expected =
      (1000 * 0.6 + 1000 * 0.06 + 600 * 10 + 400 * 0.3 + 50 * 2.4 + 500 * 20) /
      1_000_000;
    expect(usage.costUsd).toBeCloseTo(expected, 10);
    expect(usage).toMatchObject({ inputTokens: 3_000, outputTokens: 550 });
  });

  it("prices a dated snapshot like its family", () => {
    expect(
      priceResponseUsage("gpt-realtime-2.1-mini-2026-08-01", USAGE).costUsd,
    ).toBeCloseTo(priceResponseUsage("gpt-realtime-2.1-mini", USAGE).costUsd);
    expect(
      priceResponseUsage("gpt-realtime-2.1", USAGE).costUsd,
    ).toBeGreaterThan(priceResponseUsage("gpt-realtime-2.1-mini", USAGE).costUsd);
  });

  it("counts an unknown model's tokens at no price rather than guessing one", () => {
    expect(priceResponseUsage("some-future-model", USAGE)).toEqual({
      costUsd: 0,
      inputTokens: 3_000,
      outputTokens: 550,
    });
  });

  it("survives a missing usage block", () => {
    expect(priceResponseUsage("gpt-realtime-2.1-mini", undefined)).toEqual({
      costUsd: 0,
      inputTokens: 0,
      outputTokens: 0,
    });
  });
});

describe("priceTranscriptionUsage", () => {
  it("prices the tokens the GPT-4o transcribers report", () => {
    // What gpt-4o-mini-transcribe actually sends: no duration at all.
    expect(
      priceTranscriptionUsage("gpt-4o-mini-transcribe", {
        input_tokens: 1_000,
        output_tokens: 200,
        type: "tokens",
      }),
    ).toEqual({ costUsd: 0.00225, inputTokens: 1_000, outputTokens: 200 });
  });

  it("prices a duration by the minute", () => {
    expect(
      priceTranscriptionUsage("whisper-1", { seconds: 30, type: "duration" })
        .costUsd,
    ).toBeCloseTo(0.003);
  });

  it("counts an unknown model's tokens at zero dollars", () => {
    expect(
      priceTranscriptionUsage("new-transcriber", {
        input_tokens: 10,
        type: "tokens",
      }),
    ).toEqual({ costUsd: 0, inputTokens: 10, outputTokens: 0 });
  });
});
