import { NotFoundException, UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { InterviewSessionSummary } from "@cvforge/types";
import { AuthService } from "../auth/auth.service";
import { InterviewController } from "./interview.controller";
import { InterviewService } from "./interview.service";

const SESSION_SUMMARY: InterviewSessionSummary = {
  aiResponse: null,
  aiResponseGeneratedAt: null,
  aiStatus: "idle",
  chunks: [],
  completedAt: null,
  createdAt: "2026-04-24T13:00:00.000Z",
  id: "session-001",
  language: "fr",
  lastError: null,
  profile: "standard",
  recoverable: true,
  status: "idle",
  transcript: "",
  updatedAt: "2026-04-24T13:00:00.000Z",
};

function makeController(sessionOverride: unknown = { email: "user@test.example" }) {
  const interviewService = {
    getSession: vi.fn().mockReturnValue(SESSION_SUMMARY),
    startSession: vi.fn().mockReturnValue({
      session: SESSION_SUMMARY,
      sessionId: "session-001",
    }),
    finishSession: vi.fn().mockReturnValue({
      ...SESSION_SUMMARY,
      completedAt: "2026-04-24T13:15:00.000Z",
      recoverable: false,
      status: "completed",
      updatedAt: "2026-04-24T13:15:00.000Z",
    }),
    transcribeChunk: vi.fn().mockResolvedValue({
      ...SESSION_SUMMARY,
      status: "recording",
      transcript: "bonjour",
    }),
  } as unknown as InterviewService;

  const authService = {
    readSessionFromCookieHeader: vi.fn().mockReturnValue(sessionOverride),
  } as unknown as AuthService;

  return new InterviewController(interviewService, authService);
}

describe("InterviewController", () => {
  it("starts a session for an authenticated user", () => {
    const controller = makeController();
    const result = controller.startSession(
      { language: "fr", profile: "technical" },
      {
      headers: { cookie: "cvforge_session=abc" },
      },
    );

    expect(result).toEqual({
      session: SESSION_SUMMARY,
      sessionId: "session-001",
    });
  });

  it("reads a stored session for an authenticated user", () => {
    const controller = makeController();
    const result = controller.getSession("session-001", {
      headers: { cookie: "cvforge_session=abc" },
    });

    expect(result).toEqual(SESSION_SUMMARY);
  });

  it("finishes a stored session for an authenticated user", () => {
    const controller = makeController();
    const result = controller.finishSession("session-001", {
      headers: { cookie: "cvforge_session=abc" },
    });

    expect(result.status).toBe("completed");
    expect(result.completedAt).toBe("2026-04-24T13:15:00.000Z");
  });

  it("forwards chunk transcription to the service", async () => {
    const controller = makeController();
    const result = await controller.transcribeChunk(
      "session-001",
      {
        chunkBase64: "AAA",
        chunkId: "chunk-1",
        endedAt: "2026-04-24T13:00:00.500Z",
        format: "webm",
        isFinal: false,
        mimeType: "audio/webm",
        sequence: 1,
        startedAt: "2026-04-24T13:00:00.000Z",
      },
      {
        headers: { cookie: "cvforge_session=abc" },
      },
    );

    expect(result.transcript).toBe("bonjour");
  });

  it("throws UnauthorizedException when no session is present", () => {
    const controller = makeController(null);

    expect(() =>
      controller.startSession(undefined, { headers: {} }),
    ).toThrow(UnauthorizedException);
  });

  it("lets not-found session errors bubble up", () => {
    const interviewService = {
      getSession: vi.fn().mockImplementation(() => {
        throw new NotFoundException("Session d'interview introuvable.");
      }),
      startSession: vi.fn(),
      transcribeChunk: vi.fn(),
    } as unknown as InterviewService;
    const authService = {
      readSessionFromCookieHeader: vi
        .fn()
        .mockReturnValue({ email: "user@test.example" }),
    } as unknown as AuthService;
    const controller = new InterviewController(interviewService, authService);

    expect(() =>
      controller.getSession("missing", { headers: { cookie: "x=y" } }),
    ).toThrow(NotFoundException);
  });
});
