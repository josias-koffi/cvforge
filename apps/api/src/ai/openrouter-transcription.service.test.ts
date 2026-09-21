import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenRouterTranscriptionConfig } from "./openrouter-transcription.config";
import { OpenRouterTranscriptionService } from "./openrouter-transcription.service";

const BASE_CONFIG: OpenRouterTranscriptionConfig = {
  apiKey: "test-key",
  baseUrl: "https://openrouter.ai/api/v1",
  model: "primary/model",
  fallbackModels: ["secondary/model"],
  maxAttempts: 2,
};

/** Keeps backoff instantaneous and deterministic across retry assertions. */
const NO_SLEEP_HOOKS = { random: () => 0, sleep: () => Promise.resolve() };

function makeService(overrides: Partial<OpenRouterTranscriptionConfig> = {}) {
  return new OpenRouterTranscriptionService(
    { ...BASE_CONFIG, ...overrides },
    NO_SLEEP_HOOKS,
  );
}

function transcriptResponse(text: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify({ text }), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

function errorResponse(status: number) {
  return Promise.resolve(new Response("{}", { status, statusText: "Error" }));
}

function bodyOf(call: [string, RequestInit]) {
  return JSON.parse(String(call[1].body)) as Record<string, unknown>;
}

describe("OpenRouterTranscriptionService", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockImplementation(() => transcriptResponse("bonjour"));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts the clip to the dedicated transcription endpoint", async () => {
    await makeService().transcribe({
      audioBase64: "AAAA",
      format: "wav",
      language: "fr",
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(url).toBe("https://openrouter.ai/api/v1/audio/transcriptions");
    expect(init.method).toBe("POST");
    expect(bodyOf([url, init])).toEqual({
      model: "primary/model",
      input_audio: { data: "AAAA", format: "wav" },
      language: "fr",
    });
  });

  it("sends none of the chat-era knobs that used to truncate the transcript", async () => {
    await makeService().transcribe({ audioBase64: "AAAA", format: "wav" });

    const body = bodyOf(fetchMock.mock.calls[0] as [string, RequestInit]);

    expect(body).not.toHaveProperty("max_tokens");
    expect(body).not.toHaveProperty("response_format");
    expect(body).not.toHaveProperty("provider");
    expect(body).not.toHaveProperty("messages");
    expect(body).not.toHaveProperty("language");
  });

  it("returns the trimmed transcript", async () => {
    fetchMock.mockImplementation(() => transcriptResponse("  bonjour à tous  "));

    await expect(
      makeService().transcribe({ audioBase64: "AAAA", format: "wav" }),
    ).resolves.toBe("bonjour à tous");
  });

  it("treats silence as an empty transcript, not an error", async () => {
    // The browser VAD trips on a cough; throwing here used to fail the session.
    for (const payload of ["", "   ", undefined, null]) {
      fetchMock.mockImplementation(() => transcriptResponse(payload));

      await expect(
        makeService().transcribe({ audioBase64: "AAAA", format: "wav" }),
      ).resolves.toBe("");
    }
  });

  it("falls back to the next model when the first is throttled", async () => {
    fetchMock
      .mockImplementationOnce(() => errorResponse(429))
      .mockImplementationOnce(() => errorResponse(429))
      .mockImplementationOnce(() => transcriptResponse("depuis le repli"));

    await expect(
      makeService().transcribe({ audioBase64: "AAAA", format: "wav" }),
    ).resolves.toBe("depuis le repli");

    const models = fetchMock.mock.calls.map(
      ([, init]) => bodyOf(["", init as RequestInit]).model,
    );
    expect(models).toEqual([
      "primary/model",
      "primary/model",
      "secondary/model",
    ]);
  });

  it("falls back when a model is unroutable for this account", async () => {
    // What a ZDR-blocked model actually returns: 404, not a transport error.
    fetchMock
      .mockImplementationOnce(() => errorResponse(404))
      .mockImplementationOnce(() => transcriptResponse("depuis le repli"));

    await expect(
      makeService().transcribe({ audioBase64: "AAAA", format: "wav" }),
    ).resolves.toBe("depuis le repli");
  });

  it("does not shop the chain around on a bad key", async () => {
    fetchMock.mockImplementation(() => errorResponse(401));

    await expect(
      makeService().transcribe({ audioBase64: "AAAA", format: "wav" }),
    ).rejects.toThrow();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("passes a supported container through and falls back to wav otherwise", async () => {
    const service = makeService();

    for (const [format, expected] of [
      ["webm", "webm"],
      ["MP3", "mp3"],
      [" ogg ", "ogg"],
      ["aiff", "wav"],
      ["", "wav"],
    ]) {
      fetchMock.mockClear();
      await service.transcribe({ audioBase64: "AAAA", format: format! });

      const body = bodyOf(fetchMock.mock.calls[0] as [string, RequestInit]);
      expect((body.input_audio as { format: string }).format).toBe(expected);
    }
  });
});
