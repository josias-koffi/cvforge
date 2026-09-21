import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveVoiceConfig } from "./openrouter-voice.config";

const KEYS = [
  "INTERVIEW_VOICE",
  "INTERVIEW_VOICE_FALLBACK_MODELS",
  "INTERVIEW_VOICE_MAX_ATTEMPTS",
  "INTERVIEW_VOICE_MAX_TOKENS",
  "INTERVIEW_VOICE_MODEL",
  "OPENROUTER_API_KEY",
  "OPENROUTER_BASE_URL",
  "OPENROUTER_MAX_ATTEMPTS",
] as const;

describe("resolveVoiceConfig", () => {
  const saved = new Map<string, string | undefined>();

  beforeEach(() => {
    for (const key of KEYS) {
      saved.set(key, process.env[key]);
      delete process.env[key];
    }
    process.env.OPENROUTER_API_KEY = "test-key";
  });

  afterEach(() => {
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("refuses to start without an API key", () => {
    delete process.env.OPENROUTER_API_KEY;

    expect(() => resolveVoiceConfig()).toThrow(/OPENROUTER_API_KEY/);
  });

  it("falls back to the measured defaults", () => {
    expect(resolveVoiceConfig()).toEqual({
      apiKey: "test-key",
      baseUrl: "https://openrouter.ai/api/v1",
      fallbackModels: ["openai/gpt-audio"],
      maxAttempts: 2,
      maxTokens: 400,
      model: "openai/gpt-audio-mini",
      voice: "alloy",
    });
  });

  it("reads the voice model, voice and chain from the environment", () => {
    // These were read by the config but set nowhere — no .env.example, no
    // compose file — so the voice always ran the compiled defaults.
    process.env.INTERVIEW_VOICE_MODEL = "openai/gpt-audio";
    process.env.INTERVIEW_VOICE = "verse";
    process.env.INTERVIEW_VOICE_FALLBACK_MODELS = "a/one, b/two";

    const config = resolveVoiceConfig();

    expect(config.model).toBe("openai/gpt-audio");
    expect(config.voice).toBe("verse");
    expect(config.fallbackModels).toEqual(["a/one", "b/two"]);
  });

  it("keeps the shared attempts budget away from the voice", () => {
    // OPENROUTER_MAX_ATTEMPTS is 3 in every compose file. Honouring it here
    // meant three attempts on each of two models: six round trips of silence.
    process.env.OPENROUTER_MAX_ATTEMPTS = "3";

    expect(resolveVoiceConfig().maxAttempts).toBe(2);
  });

  it("takes its own attempts budget when one is given", () => {
    process.env.INTERVIEW_VOICE_MAX_ATTEMPTS = "1";

    expect(resolveVoiceConfig().maxAttempts).toBe(1);
  });

  it("caps the reply length from the environment", () => {
    process.env.INTERVIEW_VOICE_MAX_TOKENS = "250";

    expect(resolveVoiceConfig().maxTokens).toBe(250);
  });

  it("ignores nonsense rather than starting with a broken budget", () => {
    process.env.INTERVIEW_VOICE_MAX_ATTEMPTS = "zero";
    process.env.INTERVIEW_VOICE_MAX_TOKENS = "-4";

    const config = resolveVoiceConfig();

    expect(config.maxAttempts).toBe(2);
    expect(config.maxTokens).toBe(400);
  });

  it("treats a blank value as unset, the way compose leaves one", () => {
    process.env.INTERVIEW_VOICE_MODEL = "   ";

    expect(resolveVoiceConfig().model).toBe("openai/gpt-audio-mini");
  });

  it("takes `none` as an explicit refusal to fall back", () => {
    process.env.INTERVIEW_VOICE_FALLBACK_MODELS = "none";

    expect(resolveVoiceConfig().fallbackModels).toEqual([]);
  });
});
