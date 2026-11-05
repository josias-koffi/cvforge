import { describe, expect, it, vi } from "vitest";
import {
  FranceTravailReconciler,
  RECONCILE_KEY,
} from "./france-travail-reconcile.service";
import type { NormalizedJobListing } from "./job-search.types";
import type { StreamReader } from "./job-stream.service";
import { MemoryCursors } from "./job-stream.testing";
import type { StreamSliceResult } from "./sources/france-travail.stream";

const NOW = Date.parse("2026-10-10T06:00:00Z");
const HOUR = 3_600_000;

function offers(prefix: string, count: number): NormalizedJobListing[] {
  return Array.from(
    { length: count },
    (_, index) =>
      ({ externalId: `${prefix}${index}`, source: "france_travail" }) as NormalizedJobListing,
  );
}

function setup(options: {
  read?: (from: Date) => StreamSliceResult;
  held?: Set<string>;
  cursorAt?: Date | null;
  disabled?: boolean;
}) {
  const cursors = new MemoryCursors();
  cursors.cursorAt = options.cursorAt ?? null;
  const held = options.held ?? new Set<string>();
  const reader: StreamReader = {
    isEnabled: () => !options.disabled,
    read: vi.fn(async (from: Date) =>
      options.read ? options.read(from) : { calls: 1, kind: "ok" as const, listings: [] },
    ),
  };
  const jobs = {
    closeListingsNotSeenSince: vi.fn(async () => 7),
    touchListings: vi.fn(async ({ externalIds }: { externalIds: readonly string[] }) =>
      externalIds.filter((id) => !held.has(id)),
    ),
  };
  const sink = vi.fn(async (_listings: NormalizedJobListing[]) => {});
  const reconciler = new FranceTravailReconciler(
    reader,
    cursors,
    { listDisabled: async () => new Set() },
    jobs,
    sink,
    () => NOW,
    "owner",
  );

  return { cursors, jobs, reader, reconciler, sink };
}

/** Every chunk of the walk returns a thousand-odd offers: a credible market. */
const credible = (from: Date): StreamSliceResult => ({
  calls: 2,
  kind: "ok",
  listings: offers(`t${from.getTime()}-`, 10),
});

describe("FranceTravailReconciler", () => {
  it("walks the 90 days, stores what it does not hold, then closes what it did not find", async () => {
    const held = new Set<string>();
    const { cursors, jobs, reader, reconciler, sink } = setup({ held, read: credible });

    const result = await reconciler.run();

    // 90 days in 3-hour chunks.
    expect(reader.read).toHaveBeenCalledTimes(720);
    expect(result).toMatchObject({ closed: 7, seen: 7_200, status: "done", stored: 7_200 });
    expect(sink).toHaveBeenCalledTimes(720);
    expect(jobs.closeListingsNotSeenSince).toHaveBeenCalledWith({
      at: new Date(NOW).toISOString(),
      createdSince: new Date(NOW - 90 * 24 * HOUR).toISOString(),
      seenBefore: new Date(NOW).toISOString(),
      source: "france_travail",
    });
    expect(cursors.cursorAt).toEqual(new Date(NOW));
    expect(cursors.reports.get(RECONCILE_KEY)).toMatchObject({ status: "done" });
  });

  it("only marks the offers it already holds, without storing them again", async () => {
    const held = new Set<string>();
    for (let t = NOW - 90 * 24 * HOUR; t < NOW; t += 3 * HOUR) {
      held.add(`held-${t}-0`).add(`held-${t}-1`);
    }
    const { reconciler, sink } = setup({
      held,
      read: (from) => ({
        calls: 1,
        kind: "ok",
        listings: offers(`held-${from.getTime()}-`, 2),
      }),
    });

    expect(await reconciler.run()).toMatchObject({ status: "done", stored: 0 });
    expect(sink).not.toHaveBeenCalled();
  });

  it("closes nothing and does not count as done when a slice fails", async () => {
    let calls = 0;
    const { cursors, jobs, reconciler } = setup({
      read: (from) =>
        ++calls === 300
          ? { kind: "failed", reason: "unavailable 500", retryAfterMs: null, throttled: false }
          : credible(from),
    });

    expect(await reconciler.run()).toMatchObject({ status: "failed" });
    expect(jobs.closeListingsNotSeenSince).not.toHaveBeenCalled();
    // Not moved to the walk's start: only the lease placeholder (epoch) is there.
    expect(cursors.cursorAt).toEqual(new Date(0));
  });

  it("closes nothing when the walk finds too few offers to be credible", async () => {
    const { jobs, reconciler } = setup({});

    expect(await reconciler.run()).toMatchObject({ seen: 0, status: "failed" });
    expect(jobs.closeListingsNotSeenSince).not.toHaveBeenCalled();
  });

  it("keeps its lease alive during the walk, without moving the cursor of the last complete one", async () => {
    const { cursors, reconciler } = setup({ cursorAt: new Date(NOW - 30 * HOUR), read: credible });
    const advance = vi.spyOn(cursors, "advance");

    await reconciler.run();

    // One renewal per chunk, all at the previous cursor, then the final move.
    expect(advance).toHaveBeenCalledTimes(721);
    expect(advance.mock.calls[0]![2]).toEqual(new Date(NOW - 30 * HOUR));
    expect(advance.mock.calls[720]![2]).toEqual(new Date(NOW));
  });

  it("stops after the current chunk when the process shuts down, closing nothing", async () => {
    const { jobs, reader, reconciler } = setup({ read: credible });
    vi.mocked(reader.read).mockImplementation(async (from: Date) => {
      void reconciler.onModuleDestroy();
      return credible(from);
    });

    expect(await reconciler.run()).toMatchObject({ reason: "shutdown, nothing closed", status: "failed" });
    expect(jobs.closeListingsNotSeenSince).not.toHaveBeenCalled();
  });

  it("waits for the next day once a walk is done", async () => {
    const { reader, reconciler } = setup({ cursorAt: new Date(NOW - 5 * HOUR) });

    expect(await reconciler.run()).toEqual({ reason: "not due", status: "skipped" });
    expect(reader.read).not.toHaveBeenCalled();
  });

  it("walks again after 23 hours", async () => {
    const { reader, reconciler } = setup({
      cursorAt: new Date(NOW - 24 * HOUR),
      read: credible,
    });

    expect(await reconciler.run()).toMatchObject({ status: "done" });
    expect(reader.read).toHaveBeenCalled();
  });

  it("does nothing while France Travail is inactive", async () => {
    const { reader, reconciler } = setup({ disabled: true });

    expect(await reconciler.run()).toMatchObject({ status: "skipped" });
    expect(reader.read).not.toHaveBeenCalled();
  });
});
