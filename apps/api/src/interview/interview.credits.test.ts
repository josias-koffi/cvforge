import { AI_CREDIT_ACTION_INTERVIEW_SESSION } from "@cvforge/types";
import { HttpException, HttpStatus } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { OpenRouterService } from "../ai/openrouter.service";
import type { ApplicationsService } from "../applications/applications.service";
import type { CreditsService } from "../credits/credits.service";
import type { CompanyContextService } from "../applications/company-context.service";
import { InterviewReportService } from "./interview-report.service";
import { InterviewService } from "./interview.service";
import type { InterviewSessionListRow, InterviewStore } from "./interview.types";

/** In-memory store that serves `listByUserEmail` from what was saved. */
function createStore(): InterviewStore {
  const sessions = new Map<string, Parameters<InterviewStore["save"]>[0]>();

  return {
    findById: async (id) => sessions.get(id) ?? null,
    findByIdForUserEmail: async (userEmail, id) => {
      const session = sessions.get(id);
      return session && session.userEmail === userEmail ? session : null;
    },
    save: async (session) => {
      sessions.set(session.id, session);
      return session;
    },
    listByUserEmail: async (userEmail, options) =>
      [...sessions.values()]
        .filter((session) => session.userEmail === userEmail)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .slice(0, options?.limit ?? 20)
        .map(
          (session): InterviewSessionListRow => ({
            applicationId: session.applicationId,
            applicationTitle: null,
            completedAt: session.completedAt,
            createdAt: session.createdAt,
            id: session.id,
            language: session.language,
            overallScore: session.report?.overallScore ?? null,
            profile: session.profile,
            report: session.report,
            responseCount: session.chunks.length,
            status: session.status,
          }),
        ),
    deleteByUserEmail: async () => 0,
    purgeCompletedBefore: async () => 0,
  };
}

function createApplicationsService(): ApplicationsService {
  return {
    appendInterviewReport: vi.fn(),
    getOwnedApplication: vi.fn().mockResolvedValue({ id: "app-001" }),
  } as unknown as ApplicationsService;
}

/** Derivation is a separate concern; here it is simply a no-op. */
function noCompanyContext(): CompanyContextService {
  return {
    ensureFor: vi.fn(async (application) => application),
  } as unknown as CompanyContextService;
}

function makeService(
  credits: CreditsService,
  store: InterviewStore = createStore(),
) {
  const openRouter = {} as unknown as OpenRouterService;

  return new InterviewService(
    store,
    createApplicationsService(),
    noCompanyContext(),
    new InterviewReportService(openRouter),
    credits,
  );
}

function payingCredits(): CreditsService {
  return {
    assertSufficientCredits: vi.fn().mockResolvedValue(undefined),
    consumeCredits: vi.fn().mockResolvedValue({}),
  } as unknown as CreditsService;
}

describe("interview credits", () => {
  it("charges once for a session, against the linked application", async () => {
    const credits = payingCredits();
    const service = makeService(credits);

    await service.startSession("user@example.com", "fr", "standard", "app-001");

    expect(credits.assertSufficientCredits).toHaveBeenCalledWith(
      AI_CREDIT_ACTION_INTERVIEW_SESSION,
      "user@example.com",
      15,
    );
    expect(credits.consumeCredits).toHaveBeenCalledTimes(1);
    expect(credits.consumeCredits).toHaveBeenCalledWith({
      action: AI_CREDIT_ACTION_INTERVIEW_SESSION,
      amount: 15,
      applicationId: "app-001",
      durationMinutes: 10,
      userEmail: "user@example.com",
    });
  });

  it("charges a longer interview by the minute", async () => {
    const credits = payingCredits();
    const service = makeService(credits);

    await service.startSession("user@example.com", "fr", "standard", "", 30);

    expect(credits.assertSufficientCredits).toHaveBeenCalledWith(
      AI_CREDIT_ACTION_INTERVIEW_SESSION,
      "user@example.com",
      45,
    );
    expect(credits.consumeCredits).toHaveBeenCalledWith({
      action: AI_CREDIT_ACTION_INTERVIEW_SESSION,
      amount: 45,
      applicationId: undefined,
      durationMinutes: 30,
      userEmail: "user@example.com",
    });
  });

  it("falls back to the default duration's price for a length nobody offers", async () => {
    const credits = payingCredits();
    const service = makeService(credits);

    await service.startSession("user@example.com", "fr", "standard", "", 45);

    expect(credits.consumeCredits).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 15, durationMinutes: 10 }),
    );
  });

  it("refuses without enough credits, and persists nothing", async () => {
    const store = createStore();
    const credits = {
      assertSufficientCredits: vi
        .fn()
        .mockRejectedValue(
          new HttpException("Credits insuffisants", HttpStatus.PAYMENT_REQUIRED),
        ),
      consumeCredits: vi.fn(),
    } as unknown as CreditsService;

    await expect(
      makeService(credits, store).startSession("user@example.com"),
    ).rejects.toThrow("Credits insuffisants");

    expect(credits.consumeCredits).not.toHaveBeenCalled();
    await expect(store.listByUserEmail("user@example.com")).resolves.toEqual([]);
  });

  it("hands back the untouched session on a double click, without charging twice", async () => {
    const credits = payingCredits();
    const service = makeService(credits);

    const first = await service.startSession("user@example.com");
    const second = await service.startSession("user@example.com");

    expect(second.sessionId).toBe(first.sessionId);
    expect(credits.consumeCredits).toHaveBeenCalledTimes(1);
  });

  it("opens a new session rather than hand back one of another length", async () => {
    const credits = payingCredits();
    const service = makeService(credits);

    const short = await service.startSession(
      "user@example.com",
      "fr",
      "standard",
      "",
      10,
    );
    const long = await service.startSession(
      "user@example.com",
      "fr",
      "standard",
      "",
      30,
    );

    expect(long.sessionId).not.toBe(short.sessionId);
    expect(credits.consumeCredits).toHaveBeenCalledTimes(2);
    expect(credits.consumeCredits).toHaveBeenLastCalledWith(
      expect.objectContaining({ amount: 45, durationMinutes: 30 }),
    );
  });

  it("charges again once the previous session has been spoken into", async () => {
    const credits = payingCredits();
    const store = createStore();
    const service = makeService(credits, store);

    const first = await service.startSession("user@example.com");
    const session = await store.findById(first.sessionId);
    await store.save({
      ...session!,
      chunks: [
        {
          chunkId: "c1",
          createdAt: "2026-04-24T13:00:00.000Z",
          endedAt: "2026-04-24T13:00:05.000Z",
          errorMessage: null,
          isFinal: false,
          mimeType: "audio/wav",
          sequence: 1,
          startedAt: "2026-04-24T13:00:00.000Z",
          status: "transcribed",
          transcript: "Bonjour",
        },
      ],
      status: "recording",
    });

    const second = await service.startSession("user@example.com");

    expect(second.sessionId).not.toBe(first.sessionId);
    expect(credits.consumeCredits).toHaveBeenCalledTimes(2);
  });

  it("does not hand one user the session of another", async () => {
    const credits = payingCredits();
    const store = createStore();
    const service = makeService(credits, store);

    const mine = await service.startSession("user@example.com");
    const theirs = await service.startSession("other@example.com");

    expect(theirs.sessionId).not.toBe(mine.sessionId);
    expect(credits.consumeCredits).toHaveBeenCalledTimes(2);
  });
});
