import { ATS_SCORE_ENGINE_VERSION, type AtsScoreResult } from "@cvforge/ats-score";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AtsPurgeService } from "./ats-purge.service";
import { InMemoryAtsScanStore } from "./testing/in-memory-ats-store";

const RESULT: AtsScoreResult = {
  band: "good",
  dimensions: [],
  engineVersion: ATS_SCORE_ENGINE_VERSION,
  findings: [],
  llmApplied: false,
  overallScore: 72,
};

describe("AtsPurgeService", () => {
  let store: InMemoryAtsScanStore;
  let service: AtsPurgeService;

  beforeEach(() => {
    vi.useFakeTimers();
    store = new InMemoryAtsScanStore();
    service = new AtsPurgeService(store);
  });

  afterEach(() => {
    service.onModuleDestroy();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  async function seed(expiresInMs: number) {
    return store.create({
      expiresAt: new Date(Date.now() + expiresInMs).toISOString(),
      ipHash: null,
      locale: "fr",
      result: RESULT,
      source: "public",
    });
  }

  it("drops scans past their deadline and keeps the rest", async () => {
    const expired = await seed(-1000);
    const live = await seed(1000);

    expect(await service.purge()).toBe(1);
    expect(await store.findById(expired.id)).toBeNull();
    expect(await store.findById(live.id)).not.toBeNull();
  });

  it("purges once at start-up, without waiting a day", async () => {
    await seed(-1000);

    service.onModuleInit();
    await vi.advanceTimersByTimeAsync(0);

    expect(store.scans).toHaveLength(0);
  });

  it("purges again a day later", async () => {
    service.onModuleInit();
    await vi.advanceTimersByTimeAsync(0);

    await seed(-1000);
    await vi.advanceTimersByTimeAsync(86_400_000);

    expect(store.scans).toHaveLength(0);
  });

  it("stops purging once the module is destroyed", async () => {
    service.onModuleInit();
    await vi.advanceTimersByTimeAsync(0);
    service.onModuleDestroy();

    await seed(-1000);
    await vi.advanceTimersByTimeAsync(86_400_000);

    expect(store.scans).toHaveLength(1);
  });

  it("tolerates being destroyed without having started", () => {
    expect(() => service.onModuleDestroy()).not.toThrow();
  });

  /**
   * Nothing awaits the scheduled purge, so a database error would surface as an
   * unhandled rejection and take the API down.
   */
  it("logs a failure instead of crashing the process", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    vi.spyOn(store, "deleteExpired").mockRejectedValue(new Error("db down"));

    service.onModuleInit();
    await vi.advanceTimersByTimeAsync(0);

    expect(consoleError).toHaveBeenCalledWith(
      "[ats] retention purge failed",
      expect.any(Error),
    );
  });
});
