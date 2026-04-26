import { describe, expect, it, vi } from "vitest";
import type { OpenRouterService } from "../ai/openrouter.service";
import type { InterviewStore } from "./interview.types";
import { InterviewService } from "./interview.service";

async function* asyncChunks(chunks: string[]): AsyncGenerator<string> {
  for (const chunk of chunks) {
    yield chunk;
  }
}

function createStore(): InterviewStore {
  const sessions = new Map<string, ReturnType<InterviewService["startSession"]>["session"] & { userEmail: string }>();

  return {
    findById: (sessionId) => sessions.get(sessionId) ?? null,
    findByIdForUserEmail: (userEmail, sessionId) => {
      const session = sessions.get(sessionId);
      if (!session || session.userEmail !== userEmail) {
        return null;
      }
      return session;
    },
    save: (session) => {
      sessions.set(session.id, session);
      return session;
    },
  };
}

describe("InterviewService", () => {
  it("starts an empty interview session", () => {
    const service = new InterviewService(
      createStore(),
      { transcribeAudio: vi.fn() } as unknown as OpenRouterService,
    );

    const result = service.startSession("user@example.com");

    expect(result.sessionId).toContain("interview_");
    expect(result.session.status).toBe("idle");
    expect(result.session.chunks).toEqual([]);
    expect(result.session.language).toBe("fr");
    expect(result.session.profile).toBe("standard");
    expect(result.session.completedAt).toBeNull();
  });

  it("appends transcribed chunks and concatenates the transcript", async () => {
    const openRouter = {
      transcribeAudio: vi
        .fn()
        .mockResolvedValueOnce("Bonjour")
        .mockResolvedValueOnce("comment ca va"),
    } as unknown as OpenRouterService;
    const service = new InterviewService(createStore(), openRouter);
    const { sessionId } = service.startSession("user@example.com");

    const first = await service.transcribeChunk("user@example.com", sessionId, {
      chunkBase64: "AAA",
      chunkId: "chunk-1",
      endedAt: "2026-04-24T13:00:00.500Z",
      format: "webm",
      isFinal: false,
      mimeType: "audio/webm",
      sequence: 1,
      startedAt: "2026-04-24T13:00:00.000Z",
    });
    const second = await service.transcribeChunk("user@example.com", sessionId, {
      chunkBase64: "BBB",
      chunkId: "chunk-2",
      endedAt: "2026-04-24T13:00:01.000Z",
      format: "webm",
      isFinal: true,
      mimeType: "audio/webm",
      sequence: 2,
      startedAt: "2026-04-24T13:00:00.500Z",
    });

    expect(first.status).toBe("recording");
    expect(second.status).toBe("ready");
    expect(second.transcript).toBe("Bonjour comment ca va");
    expect(openRouter.transcribeAudio).toHaveBeenCalledTimes(2);
  });

  it("does not re-transcribe an already known chunk", async () => {
    const openRouter = {
      transcribeAudio: vi.fn().mockResolvedValue("Bonjour"),
    } as unknown as OpenRouterService;
    const service = new InterviewService(createStore(), openRouter);
    const { sessionId } = service.startSession("user@example.com");

    await service.transcribeChunk("user@example.com", sessionId, {
      chunkBase64: "AAA",
      chunkId: "chunk-1",
      endedAt: "2026-04-24T13:00:00.500Z",
      format: "webm",
      isFinal: false,
      mimeType: "audio/webm",
      sequence: 1,
      startedAt: "2026-04-24T13:00:00.000Z",
    });
    const result = await service.transcribeChunk("user@example.com", sessionId, {
      chunkBase64: "AAA",
      chunkId: "chunk-1",
      endedAt: "2026-04-24T13:00:00.500Z",
      format: "webm",
      isFinal: false,
      mimeType: "audio/webm",
      sequence: 1,
      startedAt: "2026-04-24T13:00:00.000Z",
    });

    expect(result.chunks).toHaveLength(1);
    expect(openRouter.transcribeAudio).toHaveBeenCalledTimes(1);
  });

  it("starts session with idle AI status", () => {
    const service = new InterviewService(
      createStore(),
      { transcribeAudio: vi.fn() } as unknown as OpenRouterService,
    );

    const result = service.startSession("user@example.com");

    expect(result.session.aiStatus).toBe("idle");
    expect(result.session.aiResponse).toBeNull();
    expect(result.session.aiResponseGeneratedAt).toBeNull();
  });

  it("stores the requested interview language on session start", () => {
    const service = new InterviewService(
      createStore(),
      { transcribeAudio: vi.fn() } as unknown as OpenRouterService,
    );

    const result = service.startSession("user@example.com", "en");

    expect(result.session.language).toBe("en");
  });

  it("stores the requested recruiter profile on session start", () => {
    const service = new InterviewService(
      createStore(),
      { transcribeAudio: vi.fn() } as unknown as OpenRouterService,
    );

    const result = service.startSession(
      "user@example.com",
      "fr",
      "technical",
    );

    expect(result.session.profile).toBe("technical");
  });

  it("streams AI response chunks and marks session done", async () => {
    const openRouter = {
      transcribeAudio: vi.fn().mockResolvedValue("Bonjour"),
      streamChat: vi.fn().mockReturnValue(asyncChunks(["Bonne ", "reponse!"])),
    } as unknown as OpenRouterService;
    const service = new InterviewService(createStore(), openRouter);
    const { sessionId } = service.startSession("user@example.com");

    const session = service.getSession("user@example.com", sessionId);
    const store = createStore();
    store.save({ ...session, transcript: "Test transcript", userEmail: "user@example.com" });
    const svc = new InterviewService(store, openRouter);

    const events: string[] = [];
    for await (const event of svc.streamAIResponse("user@example.com", sessionId)) {
      events.push(event.type);
    }

    expect(events).toContain("chunk");
    expect(events[events.length - 1]).toBe("done");
  });

  it("marks a session completed when the user finishes cleanly", () => {
    const service = new InterviewService(
      createStore(),
      { transcribeAudio: vi.fn() } as unknown as OpenRouterService,
    );
    const { sessionId } = service.startSession("user@example.com", "fr", "passive");

    const completed = service.finishSession("user@example.com", sessionId);

    expect(completed.status).toBe("completed");
    expect(completed.completedAt).toBeTruthy();
    expect(completed.recoverable).toBe(false);
    expect(completed.profile).toBe("passive");
  });

  it("yields error event when no transcript is available", async () => {
    const service = new InterviewService(
      createStore(),
      { streamChat: vi.fn() } as unknown as OpenRouterService,
    );
    const { sessionId } = service.startSession("user@example.com");

    const events = [];
    for await (const event of service.streamAIResponse("user@example.com", sessionId)) {
      events.push(event);
    }

    expect(events[0]?.type).toBe("error");
    expect(events[0]?.message).toContain("transcription");
  });

  it("stores recoverable errors when transcription fails", async () => {
    const service = new InterviewService(createStore(), {
      transcribeAudio: vi.fn().mockRejectedValue(new Error("remote failure")),
    } as unknown as OpenRouterService);
    const { sessionId } = service.startSession("user@example.com");

    const result = await service.transcribeChunk("user@example.com", sessionId, {
      chunkBase64: "AAA",
      chunkId: "chunk-1",
      endedAt: "2026-04-24T13:00:00.500Z",
      format: "webm",
      isFinal: false,
      mimeType: "audio/webm",
      sequence: 1,
      startedAt: "2026-04-24T13:00:00.000Z",
    });

    expect(result.status).toBe("error");
    expect(result.lastError).toContain("remote failure");
    expect(result.recoverable).toBe(true);
    expect(result.chunks[0]?.status).toBe("failed");
  });
});
