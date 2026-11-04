import { describe, expect, it, vi } from "vitest";
import { BoardDiscoveryService, DISCOVERY_KEY } from "./board-discovery.service";
import { MemoryCursors } from "./job-stream.testing";
import type { DiscoveryReport } from "./sources/boards/crawl-runner";

const NOW = Date.parse("2026-11-05T06:00:00Z");
const HOUR = 3_600_000;

function report(answered: boolean): DiscoveryReport {
  return {
    alreadyKnown: 0,
    candidates: 10,
    deferred: 0,
    empty: 1,
    gone: 2,
    indexFailures: answered ? 0 : 7,
    patterns: [
      { candidates: 10, collection: answered ? "CC-MAIN-2026-43" : null, pagesRead: 1, pattern: "x" },
    ],
    registered: 3,
    unverified: 0,
  };
}

function setup(options: { answered?: boolean; cursorAt?: Date | null; fails?: boolean } = {}) {
  const cursors = new MemoryCursors();
  cursors.cursorAt = options.cursorAt ?? null;
  const runner = {
    run: vi.fn(async () => {
      if (options.fails) throw new Error("db down");
      return report(options.answered ?? true);
    }),
  };

  return { cursors, runner, service: new BoardDiscoveryService(runner, cursors, () => NOW, "me") };
}

describe("BoardDiscoveryService", () => {
  it("runs, reports and marks the day done", async () => {
    const { cursors, runner, service } = setup();

    expect(await service.run()).toMatchObject({ registered: 3, status: "done" });
    expect(runner.run).toHaveBeenCalledTimes(1);
    expect(cursors.cursorAt).toEqual(new Date(NOW));
    expect(cursors.reports.get(DISCOVERY_KEY)).toMatchObject({ status: "done" });
  });

  it("waits for the next day once a run is done", async () => {
    const { runner, service } = setup({ cursorAt: new Date(NOW - 5 * HOUR) });

    expect(await service.run()).toEqual({ reason: "not due", status: "skipped" });
    expect(runner.run).not.toHaveBeenCalled();
  });

  it("does not count a run as done when no crawl answered, so the next check retries", async () => {
    const { cursors, service } = setup({ answered: false });

    expect(await service.run()).toEqual({ reason: "no crawl answered", status: "failed" });
    expect(cursors.cursorAt).toBeNull();
  });

  it("reports a crash instead of throwing", async () => {
    const { cursors, service } = setup({ fails: true });

    expect(await service.run()).toEqual({ reason: "Error: db down", status: "failed" });
    expect(cursors.cursorAt).toBeNull();
  });
});
