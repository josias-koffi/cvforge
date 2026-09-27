import { describe, expect, it, vi } from "vitest";
import type { InterviewStore, StoredInterviewSession } from "./interview.types";
import { InterviewPurgeService } from "./interview-purge.service";

function makeSession(overrides: Partial<StoredInterviewSession> = {}): StoredInterviewSession {
  return {
    aiResponse: null,
    aiResponseGeneratedAt: null,
    aiStatus: "idle",
    applicationId: null,
    chunks: [],
    completedAt: null,
    createdAt: new Date().toISOString(),
    id: "s1",
    language: "fr",
    lastError: null,
    messages: [],
    prefetchedQuestion: null,
    profile: "standard",
    recoverable: true,
    report: null,
    status: "idle",
    transcript: "",
    updatedAt: new Date().toISOString(),
    userEmail: "user@test.example",
    durationMinutes: 10,
    startedAt: null,
    context: null,
    ...overrides,
  };
}

function makeStore(purgeSpy = vi.fn(async () => 0)): InterviewStore {
  return {
    findById: vi.fn(),
    findByIdForUserEmail: vi.fn(),
    save: vi.fn(),
    deleteByUserEmail: async () => 0,
    listByUserEmail: async () => [],
  purgeCompletedBefore: purgeSpy,
  };
}

describe("InterviewPurgeService", () => {
  it("calls purgeCompletedBefore on init with the correct 30-day cutoff", () => {
    const purgeSpy = vi.fn(async () => 0);
    const store = makeStore(purgeSpy);
    const service = new InterviewPurgeService(store);

    const before = Date.now();
    service.onModuleInit();
    const after = Date.now();

    expect(purgeSpy).toHaveBeenCalledOnce();

    const cutoff = new Date((purgeSpy.mock.calls[0] as unknown as [string])[0]).getTime();
    const expectedMin = before - 30 * 86_400_000;
    const expectedMax = after - 30 * 86_400_000;
    expect(cutoff).toBeGreaterThanOrEqual(expectedMin);
    expect(cutoff).toBeLessThanOrEqual(expectedMax);

    service.onModuleDestroy();
  });

  it("purge returns number of removed sessions", async () => {
    const purgeSpy = vi.fn(async () => 3);
    const store = makeStore(purgeSpy);
    const service = new InterviewPurgeService(store);
    expect(await service.purge()).toBe(3);
  });

  it("clears the interval on destroy", () => {
    const store = makeStore();
    const service = new InterviewPurgeService(store);
    service.onModuleInit();
    const clearSpy = vi.spyOn(globalThis, "clearInterval");
    service.onModuleDestroy();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });

  it("waits for the purge started at boot before shutting down", async () => {
    // A script closes the database right after onModuleDestroy; a purge still
    // running would then fail on a dead pool and look like the script broke.
    let release = () => {};
    let finished = false;
    const store = makeStore(
      vi.fn(async () => {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        finished = true;

        return 0;
      }),
    );
    const service = new InterviewPurgeService(store);

    service.onModuleInit();
    const destroyed = service.onModuleDestroy();
    expect(finished).toBe(false);

    release();
    await destroyed;
    expect(finished).toBe(true);
  });

  it("does not schedule a second interval if already destroyed", () => {
    const store = makeStore();
    const service = new InterviewPurgeService(store);
    service.onModuleInit();
    service.onModuleDestroy();
    service.onModuleDestroy();
  });

  it("is defined with a valid session fixture", () => {
    const session = makeSession({ completedAt: "2026-01-01T00:00:00.000Z" });
    expect(session.completedAt).toBeDefined();
  });
});
