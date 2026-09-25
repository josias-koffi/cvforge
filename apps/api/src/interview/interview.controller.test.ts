import { NotFoundException, UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { InterviewSessionSummary } from "@cvforge/types";
import { AuthService } from "../auth/auth.service";
import type { InterviewProgressService } from "./interview-progress.service";
import type { InterviewRealtimeService } from "./interview-realtime.service";
import { InterviewController } from "./interview.controller";
import { InterviewService } from "./interview.service";

const SESSION_SUMMARY: InterviewSessionSummary = {
  aiResponse: null,
  aiResponseGeneratedAt: null,
  aiStatus: "idle",
  applicationId: "app-001",
  chunks: [],
  completedAt: null,
  createdAt: "2026-04-24T13:00:00.000Z",
  id: "session-001",
  language: "fr",
  lastError: null,
  messages: [],
  prefetchedQuestion: null,
  profile: "standard",
  report: null,
  recoverable: true,
  status: "idle",
  transcript: "",
  updatedAt: "2026-04-24T13:00:00.000Z",
  durationMinutes: 10,
  startedAt: null,
  context: null,
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

  const progressService = {
    getProgress: vi.fn().mockResolvedValue({ progress: null }),
    list: vi.fn().mockResolvedValue({ sessions: [] }),
  } as unknown as InterviewProgressService;

  const authService = {
    readSessionFromCookieHeader: vi.fn().mockReturnValue(sessionOverride),
  } as unknown as AuthService;

  const realtimeService = {
    endCall: vi.fn().mockResolvedValue(undefined),
    pauseCall: vi.fn().mockResolvedValue({ pausedAt: "2026-09-25T10:05:00.000Z" }),
    startCall: vi
      .fn()
      .mockResolvedValue({ sdp: "v=0 answer", startedAt: "2026-04-24T13:00:00.000Z" }),
  } as unknown as InterviewRealtimeService;

  const controller = new InterviewController(
    interviewService,
    progressService,
    realtimeService,
    authService,
  );

  // The mocks come back too: a test that asserts what the controller passed on
  // needs the service it passed it to.
  return { authService, controller, interviewService, realtimeService };
}

describe("InterviewController", () => {
  it("starts a session for an authenticated user", () => {
    const { controller } = makeController();
    const result = controller.startSession(
      { applicationId: "app-001", language: "fr", profile: "technical" },
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
    const { controller } = makeController();
    const result = controller.getSession("session-001", {
      headers: { cookie: "cvforge_session=abc" },
    });

    expect(result).toEqual(SESSION_SUMMARY);
  });

  it("finishes a stored session for an authenticated user", async () => {
    const { controller } = makeController();
    const result = await controller.finishSession("session-001", {
      headers: { cookie: "cvforge_session=abc" },
    });

    expect(result.status).toBe("completed");
    expect(result.completedAt).toBe("2026-04-24T13:15:00.000Z");
  });

  it("throws UnauthorizedException when no session is present", () => {
    const { controller } = makeController(null);

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
    const controller = new InterviewController(
      interviewService,
      {} as unknown as InterviewProgressService,
      {} as unknown as InterviewRealtimeService,
      authService,
    );

    expect(() =>
      controller.getSession("missing", { headers: { cookie: "x=y" } }),
    ).toThrow(NotFoundException);
  });
});

describe("live call", () => {
  const COOKIE = { headers: { cookie: "cvforge_session=abc" } };

  it("opens the call under the signed-in candidate's own email", async () => {
    // The session id comes from the browser; who it belongs to does not.
    const { controller, realtimeService } = makeController();

    const result = await controller.startRealtimeCall(
      "session-001",
      { sdp: "v=0 offer" },
      COOKIE,
    );

    expect(result).toEqual({
      sdp: "v=0 answer",
      startedAt: "2026-04-24T13:00:00.000Z",
    });
    expect(realtimeService.startCall).toHaveBeenCalledWith(
      "user@test.example",
      "session-001",
      "v=0 offer",
    );
  });

  it("refuses a call from nobody", () => {
    const { controller } = makeController(null);

    expect(() =>
      controller.startRealtimeCall("session-001", { sdp: "v=0" }, COOKIE),
    ).toThrow(UnauthorizedException);
  });

  it("pauses the signed-in candidate's own session", async () => {
    const { controller, realtimeService } = makeController();

    await expect(controller.pauseSession("session-001", COOKIE)).resolves.toEqual({
      pausedAt: "2026-09-25T10:05:00.000Z",
    });
    expect(realtimeService.pauseCall).toHaveBeenCalledWith(
      "user@test.example",
      "session-001",
    );
  });

  it("ends the call before scoring, so the last words are in the report", async () => {
    const { controller, interviewService, realtimeService } = makeController();

    await controller.finishSession("session-001", COOKIE);

    expect(realtimeService.endCall).toHaveBeenCalledWith(
      "user@test.example",
      "session-001",
    );
    expect(
      vi.mocked(realtimeService.endCall).mock.invocationCallOrder[0],
    ).toBeLessThan(
      vi.mocked(interviewService.finishSession).mock.invocationCallOrder[0]!,
    );
  });
});
