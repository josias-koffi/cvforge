import { describe, expect, it, vi } from "vitest";
import type { OpenRouterService } from "../ai/openrouter.service";
import type { ApplicationsService } from "../applications/applications.service";
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
    purgeCompletedBefore: () => 0,
  };
}

function createApplicationsService(): ApplicationsService {
  return {
    appendInterviewReport: vi.fn(),
    getOwnedApplication: vi.fn().mockReturnValue({
      extracted: {
        companyName: "Acme",
        requirements: ["TypeScript", "ATS"],
        responsibilities: ["Analyser le poste"],
        summary: "Role ATS",
        title: "Product Engineer",
      },
      id: "app-001",
      interviewReports: [],
      rawOfferText: "Role ATS TypeScript",
      userEmail: "user@example.com",
    }),
  } as unknown as ApplicationsService;
}

describe("InterviewService", () => {
  it("starts an empty interview session", () => {
    const applicationsService = createApplicationsService();
    const service = new InterviewService(
      createStore(),
      { transcribeAudio: vi.fn() } as unknown as OpenRouterService,
      applicationsService,
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
    const applicationsService = createApplicationsService();
    const openRouter = {
      transcribeAudio: vi
        .fn()
        .mockResolvedValueOnce("Bonjour")
        .mockResolvedValueOnce("comment ca va"),
    } as unknown as OpenRouterService;
    const service = new InterviewService(
      createStore(),
      openRouter,
      applicationsService,
    );
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
    const applicationsService = createApplicationsService();
    const openRouter = {
      transcribeAudio: vi.fn().mockResolvedValue("Bonjour"),
    } as unknown as OpenRouterService;
    const service = new InterviewService(
      createStore(),
      openRouter,
      applicationsService,
    );
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
    const applicationsService = createApplicationsService();
    const service = new InterviewService(
      createStore(),
      { transcribeAudio: vi.fn() } as unknown as OpenRouterService,
      applicationsService,
    );

    const result = service.startSession("user@example.com");

    expect(result.session.aiStatus).toBe("idle");
    expect(result.session.aiResponse).toBeNull();
    expect(result.session.aiResponseGeneratedAt).toBeNull();
  });

  it("stores the requested interview language on session start", () => {
    const applicationsService = createApplicationsService();
    const service = new InterviewService(
      createStore(),
      { transcribeAudio: vi.fn() } as unknown as OpenRouterService,
      applicationsService,
    );

    const result = service.startSession("user@example.com", "en");

    expect(result.session.language).toBe("en");
  });

  it("stores the requested recruiter profile on session start", () => {
    const applicationsService = createApplicationsService();
    const service = new InterviewService(
      createStore(),
      { transcribeAudio: vi.fn() } as unknown as OpenRouterService,
      applicationsService,
    );

    const result = service.startSession(
      "user@example.com",
      "fr",
      "technical",
    );

    expect(result.session.profile).toBe("technical");
  });

  it("streams AI response chunks and marks session done", async () => {
    const applicationsService = createApplicationsService();
    const openRouter = {
      transcribeAudio: vi.fn().mockResolvedValue("Bonjour"),
      streamChat: vi.fn().mockReturnValue(asyncChunks(["Bonne ", "reponse!"])),
    } as unknown as OpenRouterService;
    const service = new InterviewService(
      createStore(),
      openRouter,
      applicationsService,
    );
    const { sessionId } = service.startSession("user@example.com");

    const session = service.getSession("user@example.com", sessionId);
    const store = createStore();
    store.save({
      ...session,
      messages: [{ role: "user", content: "Test transcript", timestamp: new Date().toISOString() }],
      transcript: "Test transcript",
      userEmail: "user@example.com",
    });
    const svc = new InterviewService(store, openRouter, applicationsService);

    const events: string[] = [];
    for await (const event of svc.streamAIResponse("user@example.com", sessionId)) {
      events.push(event.type);
    }

    expect(events).toContain("chunk");
    expect(events[events.length - 1]).toBe("done");
  });

  it("marks a session completed when the user finishes cleanly", async () => {
    const applicationsService = createApplicationsService();
    const service = new InterviewService(
      createStore(),
      {
        chat: vi.fn().mockResolvedValue(
          JSON.stringify({
            improvements: ["Raccourcir certaines reponses."],
            metrics: [
              {
                detail: "Clair.",
                key: "clarity",
                label: "Clarte des reponses",
                score: 8,
              },
              {
                detail: "Mots-cles presents.",
                key: "keywords",
                label: "Mots-cles metier mentionnes",
                score: 7,
              },
              {
                detail: "Rythme correct.",
                key: "pacing",
                label: "Duree moyenne de parole par reponse",
                score: 8,
              },
              {
                detail: "Peu d'hesitations.",
                key: "hesitations",
                label: "Hesitations detectees",
                score: 8,
              },
              {
                detail: "Bonne adequation au poste.",
                key: "relevance",
                label: "Pertinence par rapport a l'offre",
                score: 8,
              },
            ],
            overallScore: 8,
            summary: "Entretien solide.",
          }),
        ),
        transcribeAudio: vi.fn().mockResolvedValue("Bonjour"),
      } as unknown as OpenRouterService,
      applicationsService,
    );
    const { sessionId } = service.startSession(
      "user@example.com",
      "fr",
      "passive",
      "app-001",
    );
    await service.transcribeChunk("user@example.com", sessionId, {
      chunkBase64: "AAA",
      chunkId: "chunk-1",
      endedAt: "2026-04-24T13:00:10.000Z",
      format: "webm",
      isFinal: true,
      mimeType: "audio/webm",
      sequence: 1,
      startedAt: "2026-04-24T13:00:00.000Z",
    });

    const completed = await service.finishSession("user@example.com", sessionId);

    expect(completed.status).toBe("completed");
    expect(completed.completedAt).toBeTruthy();
    expect(completed.recoverable).toBe(false);
    expect(completed.profile).toBe("passive");
    expect(completed.report?.overallScore).toBe(8);
  });

  it("yields error event when no transcript is available", async () => {
    const applicationsService = createApplicationsService();
    const service = new InterviewService(
      createStore(),
      { streamChat: vi.fn() } as unknown as OpenRouterService,
      applicationsService,
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
    const applicationsService = createApplicationsService();
    const service = new InterviewService(
      createStore(),
      {
        transcribeAudio: vi.fn().mockRejectedValue(new Error("remote failure")),
      } as unknown as OpenRouterService,
      applicationsService,
    );
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

  it("stores the linked application on session start", () => {
    const applicationsService = createApplicationsService();
    const service = new InterviewService(
      createStore(),
      { transcribeAudio: vi.fn() } as unknown as OpenRouterService,
      applicationsService,
    );

    const result = service.startSession(
      "user@example.com",
      "fr",
      "standard",
      "app-001",
    );

    expect(result.session.applicationId).toBe("app-001");
  });

  it("initialises session with an empty messages array", () => {
    const service = new InterviewService(
      createStore(),
      { transcribeAudio: vi.fn() } as unknown as OpenRouterService,
      createApplicationsService(),
    );

    const { session } = service.startSession("user@example.com");

    expect(session.messages).toEqual([]);
  });

  it("appends a user message to messages[] after each transcribed chunk", async () => {
    const openRouter = {
      transcribeAudio: vi
        .fn()
        .mockResolvedValueOnce("Bonjour")
        .mockResolvedValueOnce("je suis prêt"),
    } as unknown as OpenRouterService;
    const service = new InterviewService(createStore(), openRouter, createApplicationsService());
    const { sessionId } = service.startSession("user@example.com");

    await service.transcribeChunk("user@example.com", sessionId, {
      chunkBase64: "AAA",
      chunkId: "c1",
      endedAt: "2026-05-07T10:00:01Z",
      format: "webm",
      isFinal: false,
      mimeType: "audio/webm",
      sequence: 1,
      startedAt: "2026-05-07T10:00:00Z",
    });
    const after2 = await service.transcribeChunk("user@example.com", sessionId, {
      chunkBase64: "BBB",
      chunkId: "c2",
      endedAt: "2026-05-07T10:00:03Z",
      format: "webm",
      isFinal: true,
      mimeType: "audio/webm",
      sequence: 2,
      startedAt: "2026-05-07T10:00:02Z",
    });

    expect(after2.messages).toHaveLength(2);
    expect(after2.messages[0]).toMatchObject({ role: "user", content: "Bonjour" });
    expect(after2.messages[1]).toMatchObject({ role: "user", content: "je suis prêt" });
  });

  it("sends the full messages[] to the LLM on each AI turn (no context reset)", async () => {
    const streamChatMock = vi
      .fn()
      .mockReturnValueOnce(asyncChunks(["Première question."]))
      .mockReturnValueOnce(asyncChunks(["Deuxième question."]))
      .mockReturnValueOnce(asyncChunks(["Troisième question."]));
    const transcribeAudioMock = vi
      .fn()
      .mockResolvedValueOnce("Réponse 1")
      .mockResolvedValueOnce("Réponse 2")
      .mockResolvedValueOnce("Réponse 3");

    const openRouter = { transcribeAudio: transcribeAudioMock, streamChat: streamChatMock } as unknown as OpenRouterService;
    const service = new InterviewService(createStore(), openRouter, createApplicationsService());
    const { sessionId } = service.startSession("user@example.com");

    const chunkBase = { format: "webm", mimeType: "audio/webm", isFinal: true };

    for (let i = 1; i <= 3; i++) {
      await service.transcribeChunk("user@example.com", sessionId, {
        ...chunkBase,
        chunkBase64: `chunk${i}`,
        chunkId: `c${i}`,
        endedAt: `2026-05-07T10:0${i}:01Z`,
        sequence: i,
        startedAt: `2026-05-07T10:0${i}:00Z`,
      });

      const events = [];
      for await (const event of service.streamAIResponse("user@example.com", sessionId)) {
        events.push(event);
      }
      expect(events.at(-1)?.type).toBe("done");
    }

    const thirdCallMessages = streamChatMock.mock.calls[2]?.[0] as Array<{ role: string }>;
    // system + 3 user + 2 assistant = 6 messages by the third turn
    expect(thirdCallMessages.length).toBeGreaterThanOrEqual(6);
    expect(thirdCallMessages[0]?.role).toBe("system");
    // Prior assistant messages are included (no context reset)
    const assistantMessages = thirdCallMessages.filter((m) => m.role === "assistant");
    expect(assistantMessages).toHaveLength(2);
  });

  it("appends assistant message to messages[] after AI response", async () => {
    const openRouter = {
      transcribeAudio: vi.fn().mockResolvedValue("Bonjour"),
      streamChat: vi.fn().mockReturnValue(asyncChunks(["Super réponse."])),
    } as unknown as OpenRouterService;
    const service = new InterviewService(createStore(), openRouter, createApplicationsService());
    const { sessionId } = service.startSession("user@example.com");

    await service.transcribeChunk("user@example.com", sessionId, {
      chunkBase64: "AAA",
      chunkId: "c1",
      endedAt: "2026-05-07T10:00:01Z",
      format: "webm",
      isFinal: true,
      mimeType: "audio/webm",
      sequence: 1,
      startedAt: "2026-05-07T10:00:00Z",
    });

    for await (const _ of service.streamAIResponse("user@example.com", sessionId)) {
      // drain
    }

    const session = service.getSession("user@example.com", sessionId);
    expect(session.messages).toHaveLength(2);
    expect(session.messages[1]).toMatchObject({ role: "assistant", content: "Super réponse." });
  });
});
