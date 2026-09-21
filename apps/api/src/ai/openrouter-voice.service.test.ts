import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenRouterVoiceConfig } from "./openrouter-voice.config";
import {
  OpenRouterVoiceService,
  type VoiceTurnEvent,
} from "./openrouter-voice.service";

const BASE_CONFIG: OpenRouterVoiceConfig = {
  apiKey: "test-key",
  baseUrl: "https://openrouter.ai/api/v1",
  fallbackModels: ["fallback/voice"],
  maxAttempts: 2,
  maxTokens: 400,
  model: "primary/voice",
  voice: "alloy",
};

/** Keeps backoff instantaneous and deterministic across retry assertions. */
const NO_SLEEP_HOOKS = { random: () => 0, sleep: () => Promise.resolve() };

const REQUEST = {
  audio: { base64: "AAAA", format: "wav" },
  history: [{ role: "user" as const, content: "Bonjour." }],
  systemPrompt: "Tu es un recruteur.",
};

function makeService(overrides: Partial<OpenRouterVoiceConfig> = {}) {
  return new OpenRouterVoiceService(
    { ...BASE_CONFIG, ...overrides },
    NO_SLEEP_HOOKS,
  );
}

/** An SSE response whose chunks land exactly as given. */
function sseResponse(chunks: string[], status = 200) {
  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    }),
    { headers: { "content-type": "text/event-stream" }, status },
  );
}

function frame(audio: Record<string, string>) {
  return `data: ${JSON.stringify({ choices: [{ delta: { audio } }] })}\n\n`;
}

async function collect(service: OpenRouterVoiceService) {
  const events: VoiceTurnEvent[] = [];
  for await (const event of service.streamTurn(REQUEST)) events.push(event);

  return events;
}

function bodyOf(call: [string, RequestInit]) {
  return JSON.parse(String(call[1].body)) as Record<string, unknown>;
}

describe("OpenRouterVoiceService", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(sseResponse([frame({ data: "QUJD" })]));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("asks for streamed PCM audio alongside the text", async () => {
    await collect(makeService());

    const body = bodyOf(fetchMock.mock.calls[0] as [string, RequestInit]);

    // Audio output is only ever served over SSE.
    expect(body.stream).toBe(true);
    expect(body.modalities).toEqual(["text", "audio"]);
    expect(body.audio).toEqual({ voice: "alloy", format: "pcm16" });
    expect(body.model).toBe("primary/voice");
  });

  it("sends the history as text and only the latest answer as audio", async () => {
    await collect(makeService());

    const body = bodyOf(fetchMock.mock.calls[0] as [string, RequestInit]);
    const messages = body.messages as Array<{ role: string; content: unknown }>;

    expect(messages[0]).toEqual({
      role: "system",
      content: "Tu es un recruteur.",
    });
    expect(messages[1]).toEqual({ role: "user", content: "Bonjour." });
    // Replaying past audio would multiply the cost of every turn.
    expect(messages).toHaveLength(3);
    expect(messages[2]?.content).toEqual([
      { type: "input_audio", input_audio: { data: "AAAA", format: "wav" } },
    ]);
  });

  it("sends the instruction as text when the interviewer opens", async () => {
    // No audio exists yet: the candidate has not spoken. Sending an empty
    // `input_audio` instead would make the model answer silence.
    const service = makeService();
    for await (const _event of service.streamTurn({
      history: [],
      instruction: "L'entretien commence.",
      systemPrompt: "Tu es un recruteur.",
    })) {
      // Drained; the request body is what is under test.
    }

    const body = bodyOf(fetchMock.mock.calls[0] as [string, RequestInit]);
    const messages = body.messages as Array<{ role: string; content: unknown }>;

    expect(messages).toHaveLength(2);
    expect(messages[1]).toEqual({
      role: "user",
      content: "L'entretien commence.",
    });
    // The reply must still be spoken, not written.
    expect(body.modalities).toEqual(["text", "audio"]);
  });

  it("yields audio and transcript in the order they are spoken", async () => {
    fetchMock.mockResolvedValue(
      sseResponse([
        frame({ transcript: "Très" }),
        frame({ data: "QUJD" }),
        frame({ transcript: " bien." }),
        frame({ data: "REVG" }),
        "data: [DONE]\n\n",
      ]),
    );

    await expect(collect(makeService())).resolves.toEqual([
      { type: "transcript", text: "Très" },
      { type: "audio", data: "QUJD" },
      { type: "transcript", text: " bien." },
      { type: "audio", data: "REVG" },
    ]);
  });

  it("holds a frame split across two network reads", async () => {
    // Otherwise the interviewer drops syllables at random.
    const whole = frame({ data: "QUJD" });
    const cut = Math.floor(whole.length / 2);
    fetchMock.mockResolvedValue(
      sseResponse([whole.slice(0, cut), whole.slice(cut)]),
    );

    await expect(collect(makeService())).resolves.toEqual([
      { type: "audio", data: "QUJD" },
    ]);
  });

  it("skips a malformed frame rather than ending the turn", async () => {
    fetchMock.mockResolvedValue(
      sseResponse(["data: {nope\n\n", frame({ data: "QUJD" })]),
    );

    await expect(collect(makeService())).resolves.toEqual([
      { type: "audio", data: "QUJD" },
    ]);
  });

  it("falls back to the next model when the first is throttled", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response("{}", { status: 429 }))
      .mockResolvedValueOnce(new Response("{}", { status: 429 }))
      .mockResolvedValueOnce(sseResponse([frame({ data: "QUJD" })]));

    await expect(collect(makeService())).resolves.toHaveLength(1);

    const models = fetchMock.mock.calls.map(
      ([, init]) => bodyOf(["", init as RequestInit]).model,
    );
    expect(models).toEqual([
      "primary/voice",
      "primary/voice",
      "fallback/voice",
    ]);
  });

  it("does not shop the chain around on a bad key", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 401 }));

    await expect(collect(makeService())).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("passes a supported container through and falls back to wav otherwise", async () => {
    const service = makeService();

    for (const [format, expected] of [
      ["webm", "webm"],
      ["WAV", "wav"],
      ["aiff", "wav"],
    ]) {
      fetchMock.mockClear();
      const events: VoiceTurnEvent[] = [];
      for await (const event of service.streamTurn({
        ...REQUEST,
        audio: { base64: "AAAA", format: format! },
      })) {
        events.push(event);
      }

      const body = bodyOf(fetchMock.mock.calls[0] as [string, RequestInit]);
      const content = (body.messages as Array<{ content: unknown }>)[2]
        ?.content as Array<{ input_audio: { format: string } }>;
      expect(content[0]?.input_audio.format).toBe(expected);
    }
  });
});
