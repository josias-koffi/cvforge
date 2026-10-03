import { describe, expect, it, vi } from "vitest";
import type { JobSource, NormalizedJobListing } from "./job-search.types";
import {
  JobStreamService,
  resolveJobStreamConfig,
  STREAM_CHUNK_MS,
  STREAM_MAX_CATCH_UP_MS,
  STREAM_OVERLAP_MS,
  type StreamReader,
} from "./job-stream.service";
import { MemoryCursors } from "./job-stream.testing";
import type { StreamSliceResult } from "./sources/france-travail.stream";

const MINUTE = 60_000;
const NOW = Date.parse("2026-10-01T10:00:00Z");
const CONFIG = { enabled: true, intervalMs: 5 * MINUTE };

function listing(id: string): NormalizedJobListing {
  return { externalId: id, partnerUrls: [] } as unknown as NormalizedJobListing;
}

function reader(
  answer: (from: Date, to: Date) => StreamSliceResult = () => ({
    calls: 1,
    kind: "ok",
    listings: [listing("A")],
  }),
) {
  const reads: Array<[string, string]> = [];
  const fake: StreamReader = {
    isEnabled: () => true,
    read: async (from, to) => {
      reads.push([from.toISOString(), to.toISOString()]);
      return answer(from, to);
    },
  };

  return { fake, reads };
}

function createService(input: {
  reader: StreamReader;
  cursors?: MemoryCursors;
  sink?: (listings: NormalizedJobListing[]) => Promise<void>;
  now?: () => number;
  disabled?: JobSource[];
}) {
  const cursors = input.cursors ?? new MemoryCursors();
  const sink = vi.fn(input.sink ?? (async () => {}));
  const service = new JobStreamService(
    input.reader,
    cursors,
    { listDisabled: async () => new Set(input.disabled ?? []) },
    sink,
    CONFIG,
    input.now ?? (() => NOW),
    "instance-1",
  );

  return { cursors, service, sink };
}

describe("JobStreamService", () => {
  it("reads from two minutes before the cursor up to now, then moves the cursor", async () => {
    const cursors = new MemoryCursors();
    cursors.cursorAt = new Date(NOW - 5 * MINUTE);
    const { fake, reads } = reader();
    const { service, sink } = createService({ cursors, reader: fake });

    const result = await service.tick();

    expect(reads).toEqual([
      [
        new Date(NOW - 5 * MINUTE - STREAM_OVERLAP_MS).toISOString(),
        new Date(NOW).toISOString(),
      ],
    ]);
    expect(sink).toHaveBeenCalledWith([listing("A")]);
    expect(cursors.cursorAt?.toISOString()).toBe(new Date(NOW).toISOString());
    expect(result).toMatchObject({ listings: 1, slices: 1, status: "done" });
    expect(cursors.holder).toBeNull();
  });

  it("starts with the last interval when there is no cursor yet", async () => {
    const { fake, reads } = reader();
    const { service } = createService({ reader: fake });

    await service.tick();

    expect(reads[0]?.[0]).toBe(
      new Date(NOW - CONFIG.intervalMs - STREAM_OVERLAP_MS).toISOString(),
    );
  });

  it("resumes a long outage hour by hour, never further back than 31 days", async () => {
    const cursors = new MemoryCursors();
    cursors.cursorAt = new Date(NOW - 90 * 86_400_000);
    const { fake, reads } = reader();
    const { service } = createService({ cursors, reader: fake });

    await service.tick();

    expect(reads[0]?.[0]).toBe(
      new Date(NOW - STREAM_MAX_CATCH_UP_MS).toISOString(),
    );
    expect(reads).toHaveLength(STREAM_MAX_CATCH_UP_MS / STREAM_CHUNK_MS);
    // Contiguous: no hole between two chunks, no second read of one.
    for (let index = 1; index < reads.length; index += 1) {
      expect(reads[index]?.[0]).toBe(reads[index - 1]?.[1]);
    }
    expect(cursors.cursorAt?.getTime()).toBe(NOW);
  });

  it("keeps what was read before a failure, and resumes after it", async () => {
    const cursors = new MemoryCursors();
    cursors.cursorAt = new Date(NOW - 3 * STREAM_CHUNK_MS);
    let call = 0;
    const { fake } = reader(() =>
      ++call === 2
        ? { kind: "failed", reason: "network", retryAfterMs: null, throttled: false }
        : { calls: 1, kind: "ok", listings: [] },
    );
    const { service } = createService({ cursors, reader: fake });

    const result = await service.tick();

    expect(result.status).toBe("failed");
    // The first hour is done; the second, failed, is read again next time.
    expect(cursors.cursorAt?.getTime()).toBe(
      NOW - 3 * STREAM_CHUNK_MS - STREAM_OVERLAP_MS + STREAM_CHUNK_MS,
    );
  });

  it("pauses on a 429 for the Retry-After, without moving the cursor", async () => {
    const cursors = new MemoryCursors();
    const before = new Date(NOW - 5 * MINUTE);
    cursors.cursorAt = before;
    let now = NOW;
    const { fake, reads } = reader(() => ({
      kind: "failed",
      reason: "throttled 429",
      retryAfterMs: 8 * MINUTE,
      throttled: true,
    }));
    const { service } = createService({ cursors, now: () => now, reader: fake });

    expect((await service.tick()).status).toBe("failed");
    expect(cursors.cursorAt).toBe(before);

    now += 5 * MINUTE;
    expect(await service.tick()).toMatchObject({ status: "paused" });
    expect(reads).toHaveLength(1);

    now += 4 * MINUTE;
    await service.tick();
    expect(reads).toHaveLength(2);
  });

  it("keeps the cursor when the offers could not be stored", async () => {
    const cursors = new MemoryCursors();
    const before = new Date(NOW - 5 * MINUTE);
    cursors.cursorAt = before;
    const { fake } = reader();
    const { service } = createService({
      cursors,
      reader: fake,
      sink: async () => {
        throw new Error("database down");
      },
    });

    expect((await service.tick()).status).toBe("failed");
    expect(cursors.cursorAt).toBe(before);
  });

  it("lets a single instance read: the other one finds the stream locked", async () => {
    const cursors = new MemoryCursors();
    cursors.holder = "instance-2";
    const { fake, reads } = reader();
    const { service } = createService({ cursors, reader: fake });

    expect(await service.tick()).toEqual({ status: "locked" });
    expect(reads).toHaveLength(0);
  });

  it("stops at once when another instance took the lease over", async () => {
    const cursors = new MemoryCursors();
    cursors.cursorAt = new Date(NOW - 3 * STREAM_CHUNK_MS);
    cursors.stolen = true;
    const { fake, reads } = reader();
    const { service } = createService({ cursors, reader: fake });

    expect((await service.tick()).status).toBe("lost");
    expect(reads).toHaveLength(1);
  });

  it("reads nothing while an admin has switched France Travail off", async () => {
    const { fake, reads } = reader();
    const { service } = createService({
      disabled: ["france_travail"],
      reader: fake,
    });

    expect((await service.tick()).status).toBe("skipped");
    expect(reads).toHaveLength(0);
  });
});

describe("resolveJobStreamConfig", () => {
  it("is off unless asked for, every five minutes by default", () => {
    expect(resolveJobStreamConfig({})).toEqual({
      enabled: false,
      intervalMs: 5 * MINUTE,
    });
  });

  it("reads the switch and the pace, and refuses a pace under a minute", () => {
    expect(
      resolveJobStreamConfig({
        JOB_STREAM_ENABLED: "true",
        JOB_STREAM_INTERVAL_MINUTES: "10",
      }),
    ).toEqual({ enabled: true, intervalMs: 10 * MINUTE });
    expect(
      resolveJobStreamConfig({ JOB_STREAM_INTERVAL_MINUTES: "0" }).intervalMs,
    ).toBe(5 * MINUTE);
  });
});
