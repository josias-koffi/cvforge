import { describe, expect, it, vi } from "vitest";
import type { NormalizedJobListing } from "./job-search.types";
import { resyncStaleListings } from "./listing-resync";

const NOW = Date.parse("2026-10-01T06:00:00Z");

function deps(
  stale: string[],
  answers: Record<string, "open" | "closed" | "unknown">,
) {
  const listing = (id: string) =>
    ({ externalId: id, title: `${id} v2` }) as unknown as NormalizedJobListing;
  const jobs = {
    closeListing: vi.fn(async () => {}),
    listStaleOpenListings: vi.fn(async () => stale),
  };
  const deduplicator = { attach: vi.fn(async () => ({}) as never) };
  const source = {
    refresh: vi.fn(async (id: string) => {
      const kind = answers[id] ?? "unknown";
      return kind === "open"
        ? { kind, listing: listing(id) }
        : { kind };
    }),
    source: "france_travail" as const,
  };

  return { deduplicator, jobs, now: () => NOW, source };
}

describe("resyncStaleListings", () => {
  it("asks for the adverts nobody saw in 24 hours, within the 31 days proposed", async () => {
    const input = deps([], {});

    await resyncStaleListings(input);

    expect(input.jobs.listStaleOpenListings).toHaveBeenCalledWith({
      limit: 20_000,
      publishedSince: "2026-08-31T06:00:00.000Z",
      seenBefore: "2026-09-30T06:00:00.000Z",
      source: "france_travail",
    });
  });

  it("closes the withdrawn, rewrites the changed, leaves the unknown alone", async () => {
    const input = deps(["GONE", "CHANGED", "TIMEOUT"], {
      CHANGED: "open",
      GONE: "closed",
      TIMEOUT: "unknown",
    });

    const stats = await resyncStaleListings(input);

    expect(input.jobs.closeListing).toHaveBeenCalledTimes(1);
    expect(input.jobs.closeListing).toHaveBeenCalledWith(
      "france_travail",
      "GONE",
      new Date(NOW).toISOString(),
    );
    expect(input.deduplicator.attach).toHaveBeenCalledWith(
      expect.objectContaining({ externalId: "CHANGED", title: "CHANGED v2" }),
    );
    expect(stats).toEqual({
      capped: false,
      checked: 3,
      closed: 1,
      unknown: 1,
      updated: 1,
    });
  });

  it("says when the cap left adverts for tomorrow", async () => {
    const stats = await resyncStaleListings({
      ...deps(["A", "B"], {}),
      limit: 2,
    });

    expect(stats.capped).toBe(true);
  });
});
