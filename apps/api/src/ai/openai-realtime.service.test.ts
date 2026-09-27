import { BadGatewayException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { OpenAiRealtimeConfig } from "./openai-realtime.config";
import {
  OpenAiRealtimeService,
  readCallId,
  type SocketLike,
} from "./openai-realtime.service";

const CONFIG: OpenAiRealtimeConfig = {
  apiKey: "sk-test",
  baseUrl: "https://api.openai.com/v1",
  eagerness: "medium",
  maxOutputTokens: 400,
  model: "gpt-realtime-2.1-mini",
  noiseReduction: "far_field",
  transcriptionModel: "gpt-4o-mini-transcribe",
  turnDetection: "semantic",
  vadSilenceMs: 700,
  vadThreshold: 0.7,
  voice: "marin",
};

function fakeSocket() {
  const socket: SocketLike & { sent: string[] } = {
    close: vi.fn(() => socket.onclose?.()),
    onclose: null,
    onerror: null,
    onmessage: null,
    onopen: null,
    readyState: 1,
    send: vi.fn((data: string) => {
      socket.sent.push(data);
    }),
    sent: [],
  };

  return socket;
}

describe("OpenAiRealtimeService", () => {
  it("opens a call with the API key server-side and reads the call id", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("v=0 answer", {
        headers: { location: "/v1/realtime/calls/rtc_abc123" },
        status: 201,
      }),
    );
    const service = new OpenAiRealtimeService(CONFIG, { fetch: fetchMock });

    const result = await service.createCall({
      offerSdp: "v=0 offer",
      safetyIdentifier: "hash",
      session: service.buildSession({ instructions: "Brief", language: "fr" }),
    });

    expect(result).toEqual({ answerSdp: "v=0 answer", callId: "rtc_abc123" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.openai.com/v1/realtime/calls");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer sk-test",
      "OpenAI-Safety-Identifier": "hash",
    });
    const form = init.body as FormData;
    expect(form.get("sdp")).toBe("v=0 offer");
    expect(JSON.parse(String(form.get("session")))).toMatchObject({
      audio: {
        input: {
          noise_reduction: { type: "far_field" },
          transcription: { language: "fr", model: "gpt-4o-mini-transcribe" },
          turn_detection: {
            eagerness: "medium",
            interrupt_response: true,
            type: "semantic_vad",
          },
        },
        output: { voice: "marin" },
      },
      instructions: "Brief",
      model: "gpt-realtime-2.1-mini",
      truncation: { token_limits: { post_instructions: 8_000 }, type: "retention_ratio" },
      tools: [expect.objectContaining({ name: "end_interview", type: "function" })],
      type: "realtime",
    });
  });

  it("switches to a thresholded detector for a noisy room", () => {
    const service = new OpenAiRealtimeService({
      ...CONFIG,
      noiseReduction: "off",
      turnDetection: "server",
    });

    const session = service.buildSession({ instructions: "B", language: "fr" });

    expect(session.audio.input.noise_reduction).toBeNull();
    expect(session.audio.input.turn_detection).toMatchObject({
      interrupt_response: true,
      silence_duration_ms: 700,
      threshold: 0.7,
      type: "server_vad",
    });
  });

  it("reports a refused call as the recruiter being unreachable", async () => {
    const service = new OpenAiRealtimeService(CONFIG, {
      fetch: vi.fn().mockResolvedValue(new Response("quota", { status: 429 })),
    });

    await expect(
      service.createCall({ offerSdp: "v=0", safetyIdentifier: "h", session: {} }),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it("joins the call over a WebSocket authenticated with the key", () => {
    const socket = fakeSocket();
    const openSocket = vi.fn().mockReturnValue(socket);
    const service = new OpenAiRealtimeService(CONFIG, { openSocket });
    const onEvent = vi.fn();
    const onClose = vi.fn();

    const sideband = service.connect("rtc_abc", {
      onClose,
      onEvent,
      onOpen: vi.fn(),
    });

    expect(openSocket).toHaveBeenCalledWith(
      "wss://api.openai.com/v1/realtime?call_id=rtc_abc",
      { Authorization: "Bearer sk-test" },
    );

    socket.onmessage?.({ data: JSON.stringify({ type: "response.done" }) });
    socket.onmessage?.({ data: "not json" });
    expect(onEvent).toHaveBeenCalledTimes(1);

    sideband.send({ type: "session.update" });
    expect(socket.sent).toEqual([JSON.stringify({ type: "session.update" })]);

    // Closed from this side, then echoed by the socket: reported once.
    sideband.close();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("says what went wrong on the socket, and nothing about its own hangup", () => {
    const socket = fakeSocket();
    const service = new OpenAiRealtimeService(CONFIG, {
      openSocket: vi.fn().mockReturnValue(socket),
    });
    const warn = vi
      .spyOn((service as unknown as { logger: { warn: () => void } }).logger, "warn")
      .mockImplementation(() => undefined);
    const sideband = service.connect("rtc_abc", {
      onClose: vi.fn(),
      onEvent: vi.fn(),
      onOpen: vi.fn(),
    });

    socket.onerror?.({ message: "Unexpected server response: 403" });
    expect(warn).toHaveBeenCalledWith(
      "Realtime sideband error on rtc_abc: Unexpected server response: 403",
    );

    // Hung up before it opened: the socket errors, and that is our doing.
    sideband.close();
    socket.onerror?.({ message: "closed before the connection was established" });
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("refuses to start on a runtime without WebSocket", () => {
    vi.stubGlobal("WebSocket", undefined);
    try {
      expect(() => new OpenAiRealtimeService(CONFIG)).toThrow(/Node 22/);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("never throws from a hangup", async () => {
    const service = new OpenAiRealtimeService(CONFIG, {
      fetch: vi.fn().mockRejectedValue(new Error("offline")),
    });

    await expect(service.hangup("rtc_abc")).resolves.toBeUndefined();
  });
});

describe("readCallId", () => {
  it("takes the last path segment of the Location header", () => {
    expect(readCallId("/v1/realtime/calls/rtc_1")).toBe("rtc_1");
    expect(readCallId("rtc_2")).toBe("rtc_2");
    expect(readCallId(null)).toBeNull();
    expect(readCallId("")).toBeNull();
  });
});
