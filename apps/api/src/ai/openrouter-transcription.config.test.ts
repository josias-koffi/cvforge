import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveTranscriptionConfig } from "./openrouter-transcription.config";

describe("resolveTranscriptionConfig", () => {
  const original = process.env;

  beforeEach(() => {
    process.env = { ...original, OPENROUTER_API_KEY: "key" };
  });

  afterEach(() => {
    process.env = original;
  });

  it("throws when OPENROUTER_API_KEY is missing", () => {
    delete process.env.OPENROUTER_API_KEY;
    expect(() => resolveTranscriptionConfig()).toThrow("OPENROUTER_API_KEY");
  });

  it("leads with Whisper Turbo and falls back across three provider families", () => {
    delete process.env.INTERVIEW_STT_MODEL;
    delete process.env.INTERVIEW_STT_FALLBACK_MODELS;

    const config = resolveTranscriptionConfig();

    expect(config.model).toBe("openai/whisper-large-v3-turbo");
    expect(config.fallbackModels).toEqual([
      "mistralai/voxtral-mini-3b-2507",
      "nvidia/nemotron-3.5-asr-streaming-multilingual-0.6b",
    ]);
  });

  it("never names a model our account cannot route", () => {
    // Both are rejected with "ZDR violation (account settings)", which no
    // request-level flag overrides. Measured 2026-09-21, see ADR-013.
    const chain = [
      resolveTranscriptionConfig().model,
      ...resolveTranscriptionConfig().fallbackModels,
    ];

    expect(chain).not.toContain("mistralai/voxtral-mini-transcribe");
    expect(chain).not.toContain("qwen/qwen3-asr-flash-2026-02-10");
  });

  it("lets the environment override the primary and the chain", () => {
    process.env.INTERVIEW_STT_MODEL = " custom/model ";
    process.env.INTERVIEW_STT_FALLBACK_MODELS = "x/one, y/two";

    const config = resolveTranscriptionConfig();

    expect(config.model).toBe("custom/model");
    expect(config.fallbackModels).toEqual(["x/one", "y/two"]);
  });

  it("accepts `none` as an explicit single-model opt-out", () => {
    process.env.INTERVIEW_STT_FALLBACK_MODELS = "none";

    expect(resolveTranscriptionConfig().fallbackModels).toEqual([]);
  });

  it("treats a blank override as unset, since compose empties unset vars", () => {
    process.env.INTERVIEW_STT_MODEL = "";
    process.env.INTERVIEW_STT_FALLBACK_MODELS = "";

    const config = resolveTranscriptionConfig();

    expect(config.model).toBe("openai/whisper-large-v3-turbo");
    expect(config.fallbackModels).toHaveLength(2);
  });
});
