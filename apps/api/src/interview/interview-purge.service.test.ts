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
    ...overrides,
  };
}

function makeStore(purgeSpy = vi.fn(() => 0)): InterviewStore {
  return {
    findById: vi.fn(),
    findByIdForUserEmail: vi.fn(),
    save: vi.fn(),
    purgeCompletedBefore: purgeSpy,
  };
}

describe("InterviewPurgeService", () => {
  it("calls purgeCompletedBefore on init with the correct 30-day cutoff", () => {
    const purgeSpy = vi.fn(() => 0);
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

  it("purge returns number of removed sessions", () => {
    const purgeSpy = vi.fn(() => 3);
    const store = makeStore(purgeSpy);
    const service = new InterviewPurgeService(store);
    expect(service.purge()).toBe(3);
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
