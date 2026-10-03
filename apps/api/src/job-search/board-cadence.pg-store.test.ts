import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { applications, jobMatches } from "../database/schema";
import { PgBoardCadenceStore } from "./board-cadence.pg-store";
import { PgJobBoardsStore } from "./boards.pg-store";
import { JobDeduplicator } from "./dedup/job-deduplicator";
import type { NormalizedJobListing } from "./job-search.types";
import { PgJobsStore } from "./jobs.pg-store";

const NOW = Date.parse("2026-10-01T10:00:00Z");
let testDatabase: TestDatabase;
let now = NOW;
let cadence: PgBoardCadenceStore;
let registry: PgJobBoardsStore;
let deduplicator: JobDeduplicator;

beforeAll(async () => {
  testDatabase = await createTestDatabase();
  cadence = new PgBoardCadenceStore(testDatabase.db, () => now);
  registry = new PgJobBoardsStore(testDatabase.db);
  deduplicator = new JobDeduplicator(new PgJobsStore(testDatabase.db));
});

afterAll(async () => {
  await testDatabase.close();
});

beforeEach(async () => {
  await testDatabase.reset();
  now = NOW;
});

const WINDOWS = {
  followedSince: new Date(NOW - 90 * 86_400_000),
  matchedSince: new Date(NOW - 30 * 86_400_000),
  now: new Date(NOW),
};

/** A Greenhouse offer of ACME, stored, recorded as seen, and proposed. */
async function matchedOffer(externalId: string, createdAt: Date, status = "new") {
  const attached = await deduplicator.attach({
    applyUrl: "",
    companyAnonymous: false,
    companyName: "ACME",
    contractType: "cdi",
    department: "75",
    description: "Développeur à Paris.",
    externalId,
    latitude: null,
    locationLabel: "Paris",
    longitude: null,
    partnerUrls: [],
    publishedAt: null,
    raw: {},
    remote: false,
    salaryLabel: "",
    source: "greenhouse",
    title: `Développeur ${externalId}`,
    url: `https://boards.greenhouse.io/acme/jobs/${externalId}`,
  } as NormalizedJobListing);
  await cadence.recordSeen("greenhouse", "acme", [
    { announcedAt: null, externalId },
  ]);
  await testDatabase.db.insert(jobMatches).values({
    createdAt,
    digestDate: "2026-09-01",
    jobId: attached.jobId,
    profileId: "p1",
    score: 80,
    status,
    updatedAt: createdAt,
    userEmail: "ada@example.com",
  });
}

describe("PgBoardCadenceStore", () => {
  it("tells new postings apart, with the detection time next to the announced one", async () => {
    const first = await cadence.recordSeen("lever", "acme", [
      { announcedAt: "2026-09-30T08:00:00.000Z", externalId: "a" },
      { announcedAt: null, externalId: "b" },
    ]);
    now += 30 * 60_000;
    const second = await cadence.recordSeen("lever", "acme", [
      { announcedAt: null, externalId: "b" },
      { announcedAt: null, externalId: "c" },
    ]);

    expect(first).toEqual(new Set(["a", "b"]));
    expect(second).toEqual(new Set(["c"]));
    expect(await cadence.knownIds("lever", "acme")).toEqual(new Set(["a", "b", "c"]));
    // Another board's ids are its own.
    expect(await cadence.knownIds("lever", "other")).toEqual(new Set());

    const rows = await testDatabase.db.query.jobBoardPostings.findMany();
    const a = rows.find((row) => row.externalId === "a");
    const c = rows.find((row) => row.externalId === "c");
    expect(a?.announcedAt?.toISOString()).toBe("2026-09-30T08:00:00.000Z");
    expect(a?.firstSeenAt.getTime()).toBe(NOW);
    expect(c?.firstSeenAt.getTime()).toBe(NOW + 30 * 60_000);
  });

  it("finds the board of an offer that matched in the last 30 days", async () => {
    await registry.register({ boardToken: "acme", origin: "seed", provider: "greenhouse" });
    await matchedOffer("1", new Date(NOW - 2 * 86_400_000));

    expect(await cadence.listInterested(WINDOWS)).toEqual([
      {
        boardToken: "acme",
        interestAt: new Date(NOW - 2 * 86_400_000),
        provider: "greenhouse",
      },
    ]);
  });

  it("forgets an old match, but not an offer the candidate kept", async () => {
    await registry.register({ boardToken: "acme", origin: "seed", provider: "greenhouse" });
    await matchedOffer("old", new Date(NOW - 45 * 86_400_000));

    expect(await cadence.listInterested(WINDOWS)).toEqual([]);

    await matchedOffer("kept", new Date(NOW - 60 * 86_400_000), "saved");
    expect(await cadence.listInterested(WINDOWS)).toHaveLength(1);
  });

  it("leaves a board paused by a refusal to the daily pass until the pause ends", async () => {
    await registry.register({ boardToken: "acme", origin: "seed", provider: "greenhouse" });
    await matchedOffer("1", new Date(NOW - 86_400_000));
    await cadence.pauseFrequent("greenhouse", "acme", new Date(NOW + 86_400_000));

    expect(await cadence.listInterested(WINDOWS)).toEqual([]);
    expect(
      await cadence.filterReadable([{ boardToken: "acme", provider: "greenhouse" }], new Date(NOW)),
    ).toEqual([]);

    expect(
      await cadence.filterReadable(
        [{ boardToken: "acme", provider: "greenhouse" }],
        new Date(NOW + 86_400_000 + 1),
      ),
    ).toEqual([{ boardToken: "acme", provider: "greenhouse" }]);
  });

  it("lists the offer URLs of recent applications", async () => {
    const base = {
      extracted: {} as never,
      sourceType: "url" as const,
      status: "draft" as never,
      updatedAt: new Date(NOW),
      userEmail: "ada@example.com",
    };
    await testDatabase.db.insert(applications).values([
      { ...base, createdAt: new Date(NOW - 86_400_000), id: "a1", offerUrl: "https://jobs.lever.co/acme/1" },
      { ...base, createdAt: new Date(NOW - 200 * 86_400_000), id: "a2", offerUrl: "https://jobs.lever.co/old/1" },
      { ...base, createdAt: new Date(NOW), id: "a3", offerUrl: null, sourceType: "text" },
    ]);

    expect(
      (await cadence.listApplicationUrls(WINDOWS.followedSince)).map((row) => row.url),
    ).toEqual(["https://jobs.lever.co/acme/1"]);
  });
});
