import { afterEach, describe, expect, it, vi } from "vitest";
import { AcquisitionPurgeService } from "./acquisition-purge.service";
import type { AcquisitionEventStore } from "./acquisition.types";

function createService(deleteBefore = vi.fn().mockResolvedValue(3)) {
  const store: AcquisitionEventStore = { deleteBefore, record: vi.fn() };

  return {
    service: new AcquisitionPurgeService(store, () =>
      Date.parse("2026-09-24T10:00:00.000Z"),
    ),
    store,
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("AcquisitionPurgeService", () => {
  it("keeps 90 days of events", async () => {
    const { service, store } = createService();

    await expect(service.purge()).resolves.toBe(3);
    expect(store.deleteBefore).toHaveBeenCalledWith("2026-06-26");
  });

  it("purges at boot, then once a day, and stops on shutdown", async () => {
    vi.useFakeTimers();
    const { service, store } = createService();

    service.onModuleInit();
    await vi.advanceTimersByTimeAsync(86_400_000);
    await service.onModuleDestroy();
    await vi.advanceTimersByTimeAsync(86_400_000);

    expect(store.deleteBefore).toHaveBeenCalledTimes(2);
  });

  /** Nothing awaits the purge: an error must be logged, never thrown. */
  it("logs a failed purge instead of crashing the API", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { service } = createService(
      vi.fn().mockRejectedValue(new Error("down")),
    );

    service.onModuleInit();
    await service.onModuleDestroy();

    expect(error).toHaveBeenCalledWith(
      "[acquisition] retention purge failed",
      expect.any(Error),
    );
  });
});

describe("AcquisitionPurgeService — free-tool searches", () => {
  it("keeps a year of search counters on top of 90 days of events", async () => {
    const store: AcquisitionEventStore = {
      deleteBefore: vi.fn().mockResolvedValue(3),
      record: vi.fn(),
    };
    const toolQueries = {
      deleteBefore: vi.fn().mockResolvedValue(2),
      increment: vi.fn(),
    };
    const service = new AcquisitionPurgeService(
      store,
      () => Date.parse("2026-09-24T10:00:00.000Z"),
      toolQueries,
    );

    await expect(service.purge()).resolves.toBe(5);
    expect(toolQueries.deleteBefore).toHaveBeenCalledWith("2025-09-24");
  });
});
