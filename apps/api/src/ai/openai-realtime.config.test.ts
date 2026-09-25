import { describe, expect, it } from "vitest";
import { resolveOpenAiRealtimeConfig } from "./openai-realtime.config";

describe("resolveOpenAiRealtimeConfig", () => {
  it("defaults to the mini model, a Realtime voice and semantic turns", () => {
    expect(resolveOpenAiRealtimeConfig({ OPENAI_API_KEY: "sk" })).toEqual({
      apiKey: "sk",
      baseUrl: "https://api.openai.com/v1",
      eagerness: "medium",
      maxOutputTokens: 1_500,
      model: "gpt-realtime-2.1-mini",
      noiseReduction: "far_field",
      transcriptionModel: "gpt-4o-mini-transcribe",
      turnDetection: "semantic",
      vadSilenceMs: 700,
      vadThreshold: 0.7,
      voice: "marin",
    });
  });

  it("reads the noise and detection settings, rejecting nonsense", () => {
    expect(
      resolveOpenAiRealtimeConfig({
        INTERVIEW_REALTIME_NOISE_REDUCTION: "near_field",
        INTERVIEW_REALTIME_TURN_DETECTION: "server",
        INTERVIEW_REALTIME_VAD_THRESHOLD: "0.8",
        OPENAI_API_KEY: "sk",
      }),
    ).toMatchObject({
      noiseReduction: "near_field",
      turnDetection: "server",
      vadThreshold: 0.8,
    });
    expect(
      resolveOpenAiRealtimeConfig({
        INTERVIEW_REALTIME_VAD_THRESHOLD: "3",
        OPENAI_API_KEY: "sk",
      }).vadThreshold,
    ).toBe(0.7);
  });

  it("reads overrides and treats blank as unset", () => {
    const config = resolveOpenAiRealtimeConfig({
      INTERVIEW_REALTIME_EAGERNESS: "HIGH",
      INTERVIEW_REALTIME_MAX_OUTPUT_TOKENS: "250",
      INTERVIEW_REALTIME_MODEL: "gpt-realtime-2.1",
      INTERVIEW_REALTIME_VOICE: " ",
      OPENAI_API_KEY: "sk",
    });

    expect(config).toMatchObject({
      eagerness: "high",
      maxOutputTokens: 250,
      model: "gpt-realtime-2.1",
      voice: "marin",
    });
  });

  it("falls back to medium on an unknown eagerness", () => {
    expect(
      resolveOpenAiRealtimeConfig({
        INTERVIEW_REALTIME_EAGERNESS: "eager",
        OPENAI_API_KEY: "sk",
      }).eagerness,
    ).toBe("medium");
  });

  it("requires the API key", () => {
    expect(() => resolveOpenAiRealtimeConfig({ OPENAI_API_KEY: "" })).toThrow(
      /OPENAI_API_KEY/,
    );
  });
});
