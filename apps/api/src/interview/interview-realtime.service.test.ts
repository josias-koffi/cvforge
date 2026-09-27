import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type {
  OpenAiRealtimeService,
  SidebandHandlers,
} from "../ai/openai-realtime.service";
import { InterviewRealtimeService } from "./interview-realtime.service";
import type { InterviewStore, StoredInterviewSession } from "./interview.types";

function makeSession(
  overrides: Partial<StoredInterviewSession> = {},
): StoredInterviewSession {
  return {
    aiResponse: null,
    aiResponseGeneratedAt: null,
    aiStatus: "idle",
    applicationId: null,
    chunks: [],
    completedAt: null,
    context: null,
    createdAt: "2026-09-25T10:00:00.000Z",
    durationMinutes: 10,
    id: "s1",
    language: "fr",
    lastError: null,
    messages: [],
    prefetchedQuestion: null,
    profile: "standard",
    recoverable: true,
    report: null,
    startedAt: null,
    status: "idle",
    transcript: "",
    updatedAt: "2026-09-25T10:00:00.000Z",
    userEmail: "user@example.com",
    ...overrides,
  };
}

function setup(session: StoredInterviewSession | null = makeSession()) {
  const store = {
    findByIdForUserEmail: vi.fn().mockResolvedValue(session),
    save: vi.fn().mockImplementation(async (saved) => saved),
  } as unknown as InterviewStore;
  const handlers: SidebandHandlers[] = [];
  const sideband = { close: vi.fn(), send: vi.fn() };
  const realtime = {
    buildSession: vi.fn().mockReturnValue({ type: "realtime" }),
    connect: vi.fn((_callId: string, h: SidebandHandlers) => {
      handlers.push(h);
      return sideband;
    }),
    createCall: vi
      .fn()
      .mockResolvedValue({ answerSdp: "v=0 answer", callId: "rtc_1" }),
    hangup: vi.fn().mockResolvedValue(undefined),
    model: "gpt-realtime-2.1-mini",
    transcriptionModel: "gpt-4o-mini-transcribe",
  } as unknown as OpenAiRealtimeService;

  return {
    handlers,
    realtime,
    service: new InterviewRealtimeService(store, realtime),
    sideband,
    store,
  };
}

describe("InterviewRealtimeService", () => {
  it("opens the call with the brief and stamps when the interview began", async () => {
    const { realtime, service, store } = setup();

    const result = await service.startCall("user@example.com", "s1", "v=0 offer");

    expect(result.sdp).toBe("v=0 answer");
    expect(result.startedAt).toEqual(expect.any(String));
    expect(store.save).toHaveBeenCalledWith(
      expect.objectContaining({ startedAt: result.startedAt, status: "ready" }),
    );
    expect(realtime.createCall).toHaveBeenCalledWith(
      expect.objectContaining({
        offerSdp: "v=0 offer",
        // Hashed: OpenAI never learns who the candidate is.
        safetyIdentifier: expect.not.stringContaining("@"),
      }),
    );
    expect(realtime.connect).toHaveBeenCalledWith("rtc_1", expect.any(Object));
  });

  it("refuses what is not an SDP offer", async () => {
    const { service } = setup();

    await expect(
      service.startCall("user@example.com", "s1", "hello"),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.startCall("user@example.com", "s1", undefined),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("refuses somebody else's session", async () => {
    const { service } = setup(null);

    await expect(
      service.startCall("user@example.com", "s1", "v=0"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("refuses a finished interview and one whose time is long spent", async () => {
    await expect(
      setup(makeSession({ status: "completed" })).service.startCall(
        "user@example.com",
        "s1",
        "v=0",
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      setup(makeSession({ startedAt: "2020-01-01T00:00:00.000Z" })).service.startCall(
        "user@example.com",
        "s1",
        "v=0",
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("ends the previous call when the same session connects again", async () => {
    const { service, sideband } = setup();

    await service.startCall("user@example.com", "s1", "v=0");
    await service.startCall("user@example.com", "s1", "v=0");

    expect(sideband.close).toHaveBeenCalledTimes(1);
  });

  it("pauses: hangs up and stops the clock", async () => {
    const session = makeSession({ startedAt: new Date().toISOString() });
    const { realtime, service, store } = setup(session);
    await service.startCall("user@example.com", "s1", "v=0");

    const result = await service.pauseCall("user@example.com", "s1");

    expect(result.pausedAt).toEqual(expect.any(String));
    expect(realtime.hangup).toHaveBeenCalledWith("rtc_1");
    expect(store.save).toHaveBeenLastCalledWith(
      expect.objectContaining({ pausedAt: result.pausedAt }),
    );
  });

  it("resumes with the start moved forward by the length of the pause", async () => {
    const startedAt = new Date(Date.now() - 5 * 60_000).toISOString();
    const pausedAt = new Date(Date.now() - 2 * 60_000).toISOString();
    const { service } = setup(makeSession({ pausedAt, startedAt }));

    const result = await service.startCall("user@example.com", "s1", "v=0");

    // Five minutes ago, plus two minutes of pause: three minutes in.
    const elapsedMin = (Date.now() - Date.parse(result.startedAt)) / 60_000;
    expect(elapsedMin).toBeCloseTo(3, 1);
  });

  it("lets a long pause resume even past the original deadline", async () => {
    const startedAt = new Date(Date.now() - 60 * 60_000).toISOString();
    const pausedAt = new Date(Date.now() - 58 * 60_000).toISOString();
    const { service } = setup(makeSession({ pausedAt, startedAt }));

    await expect(
      service.startCall("user@example.com", "s1", "v=0"),
    ).resolves.toMatchObject({ sdp: "v=0 answer" });
  });

  it("only lets the session's owner end its call", async () => {
    const { service, sideband } = setup();
    await service.startCall("user@example.com", "s1", "v=0");

    await service.endCall("someone@else.com", "s1");
    expect(sideband.close).not.toHaveBeenCalled();

    await service.endCall("user@example.com", "s1");
    expect(sideband.close).toHaveBeenCalledTimes(1);
  });

  it("reports an ended call once, though its closing sideband echoes back", async () => {
    const { handlers, service } = setup();
    const log = vi
      .spyOn((service as unknown as { logger: { log: () => void } }).logger, "log")
      .mockImplementation(() => undefined);
    await service.startCall("user@example.com", "s1", "v=0");

    await service.endCall("user@example.com", "s1");
    handlers[0]!.onClose();
    await Promise.resolve();

    expect(log).toHaveBeenCalledTimes(1);
  });

  it("has the recruiter speak first once the sideband is up", async () => {
    const { handlers, service, sideband } = setup();
    await service.startCall("user@example.com", "s1", "v=0");

    handlers[0]!.onOpen();

    expect(sideband.send).toHaveBeenCalledWith(
      expect.objectContaining({ type: "response.create" }),
    );
  });
});
