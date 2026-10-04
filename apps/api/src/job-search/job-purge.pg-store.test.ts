import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PgApplicationsStore } from "../applications/applications.pg-store";
import {
  applications,
  jobLinks,
  jobListings,
  jobMatches,
  jobs,
} from "../database/schema";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { JobDeduplicator } from "./dedup/job-deduplicator";
import { PgJobRetentionStore } from "./job-retention.pg-store";
import { advert, jobRow } from "./job-retention.testing";
import { PgJobsStore } from "./jobs.pg-store";

const DAY_MS = 86_400_000;
const USER = "ada@example.com";
const NOW = Date.now();
const BEFORE = new Date(NOW - 30 * DAY_MS).toISOString();

let testDatabase: TestDatabase;
let retention: PgJobRetentionStore;
let deduplicator: JobDeduplicator;

beforeAll(async () => {
  testDatabase = await createTestDatabase();
  retention = new PgJobRetentionStore(testDatabase.db);
  deduplicator = new JobDeduplicator(new PgJobsStore(testDatabase.db));
});

afterAll(async () => {
  await testDatabase.close();
});

beforeEach(async () => {
  await testDatabase.reset();
});

async function job(
  externalId: string,
  dates: { publishedDaysAgo?: number; closedDaysAgo?: number } = {},
) {
  const { jobId } = await deduplicator.attach(advert(externalId));
  await testDatabase.db
    .update(jobs)
    .set({
      closedAt:
        dates.closedDaysAgo === undefined
          ? null
          : new Date(NOW - dates.closedDaysAgo * DAY_MS),
      publishedAt: new Date(NOW - (dates.publishedDaysAgo ?? 0) * DAY_MS),
    })
    .where(eq(jobs.id, jobId));

  return jobId;
}

/** A match turned into an application; without a status, one since deleted. */
async function appliedTo(
  jobId: string,
  applicationId: string,
  status?: string,
) {
  if (status) {
    await testDatabase.db.insert(applications).values({
      createdAt: new Date(NOW),
      extracted: { title: "Comptable" } as never,
      id: applicationId,
      rawOfferText: "Comptable copropriété, Paris 14e.",
      sourceType: "text",
      status: status as never,
      updatedAt: new Date(NOW),
      userEmail: USER,
    });
  }
  await testDatabase.db.insert(jobMatches).values({
    applicationId,
    digestDate: "2026-09-01",
    jobId,
    profileId: "p1",
    score: 80,
    status: "applied",
    userEmail: USER,
  });
}

async function remainingJobIds() {
  const rows = await testDatabase.db.select({ id: jobs.id }).from(jobs);

  return new Set(rows.map((row) => row.id));
}

describe("purge past 30 days (US-169)", () => {
  it("deletes what is past the window, with its adverts, links and matches", async () => {
    const fresh = await job("FRESH", { publishedDaysAgo: 2 });
    const old = await job("OLD", { publishedDaysAgo: 40 });
    const closedLong = await job("CLOSED_LONG", {
      closedDaysAgo: 31,
      publishedDaysAgo: 10,
    });
    const closedLately = await job("CLOSED_LATELY", {
      closedDaysAgo: 5,
      publishedDaysAgo: 10,
    });
    await testDatabase.db.insert(jobMatches).values({
      digestDate: "2026-09-01",
      jobId: old,
      profileId: "p1",
      score: 70,
      status: "saved",
      userEmail: USER,
    });

    expect(await retention.countExpired(BEFORE)).toEqual({
      expired: 2,
      keptForApplications: 0,
    });
    expect(await retention.purgeExpired(BEFORE)).toBe(2);

    expect(await remainingJobIds()).toEqual(new Set([fresh, closedLately]));
    for (const table of [jobListings, jobLinks, jobMatches]) {
      const left = await testDatabase.db
        .select({ jobId: table.jobId })
        .from(table)
        .where(inArray(table.jobId, [old, closedLong]));
      expect(left).toEqual([]);
    }
    expect(await testDatabase.db.select().from(jobLinks)).toHaveLength(2);
  });

  it("reads the first sighting when the source gives no publication date", async () => {
    const { jobId } = await deduplicator.attach(
      advert("UNDATED", { publishedAt: null }),
    );
    await testDatabase.db
      .update(jobs)
      .set({ firstSeenAt: new Date(NOW - 31 * DAY_MS) })
      .where(eq(jobs.id, jobId));

    expect(await retention.purgeExpired(BEFORE)).toBe(1);
  });

  it("keeps an offer an active application points to, until it is no longer active", async () => {
    const drafted = await job("DRAFT", { publishedDaysAgo: 40 });
    const sent = await job("SENT", { closedDaysAgo: 35, publishedDaysAgo: 50 });
    const interview = await job("INTERVIEW", { publishedDaysAgo: 40 });
    const rejected = await job("REJECTED", { publishedDaysAgo: 40 });
    const offered = await job("OFFERED", { publishedDaysAgo: 40 });
    const deleted = await job("DELETED", { publishedDaysAgo: 40 });
    await appliedTo(drafted, "app-draft", "draft");
    await appliedTo(sent, "app-sent", "sent");
    await appliedTo(interview, "app-interview", "interview_scheduled");
    await appliedTo(rejected, "app-rejected", "rejected");
    await appliedTo(offered, "app-offered", "offer_received");
    await appliedTo(deleted, "app-gone");

    expect(await retention.countExpired(BEFORE)).toEqual({
      expired: 3,
      keptForApplications: 3,
    });
    expect(await retention.purgeExpired(BEFORE)).toBe(3);
    expect(await remainingJobIds()).toEqual(
      new Set([drafted, sent, interview]),
    );

    // The application moves on: the next pass takes the offer.
    await testDatabase.db
      .update(applications)
      .set({ status: "rejected" })
      .where(eq(applications.id, "app-sent"));
    expect(await retention.purgeExpired(BEFORE)).toBe(1);
    expect(await remainingJobIds()).toEqual(new Set([drafted, interview]));
  });

  it("leaves the application whole once its offer is purged", async () => {
    const offer = await job("GONE", { publishedDaysAgo: 40 });
    await appliedTo(offer, "app-1", "rejected");

    await retention.purgeExpired(BEFORE);

    expect(await jobRow(testDatabase.db, offer)).toBeUndefined();
    // Its page, the CV and letter generation and the interview all read the
    // application through this store, and nothing else of the offer.
    const application = await new PgApplicationsStore(
      testDatabase.db,
    ).findByIdForUserEmail(USER, "app-1");
    expect(application).toMatchObject({
      extracted: { title: "Comptable" },
      rawOfferText: "Comptable copropriété, Paris 14e.",
      status: "rejected",
    });
  });
});
