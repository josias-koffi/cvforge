import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  deleteBefore,
  noticeGivenBefore,
  warnBefore,
} from "../applications/application-retention.rules";
import { PgApplicationsStore } from "../applications/applications.pg-store";
import {
  applicationCvVersions,
  applicationLetterVersions,
  applications,
  interviewChunks,
  interviewSessions,
  jobMatches,
  jobs,
  notifications,
} from "../database/schema";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { PgApplicationRetentionStore } from "./application-retention.pg-store";

const DAY_MS = 86_400_000;
const NOW = Date.parse("2026-10-04T08:00:00.000Z");
const USER = "ada@example.com";

let testDatabase: TestDatabase;
let store: PgApplicationRetentionStore;

beforeAll(async () => {
  testDatabase = await createTestDatabase();
  store = new PgApplicationRetentionStore(testDatabase.db);
});

afterAll(async () => {
  await testDatabase.close();
});

beforeEach(async () => {
  await testDatabase.reset();
});

function cutoffs(now = NOW) {
  return {
    deleteBefore: deleteBefore(now),
    noticeGivenBefore: noticeGivenBefore(now),
    warnBefore: warnBefore(now),
  };
}

function daysAgo(days: number, now = NOW) {
  return new Date(now - days * DAY_MS);
}

async function application(
  id: string,
  dates: { updatedDaysAgo: number; warnedDaysAgo?: number; status?: string },
) {
  await testDatabase.db.insert(applications).values({
    createdAt: daysAgo(dates.updatedDaysAgo + 10),
    deletionWarnedAt:
      dates.warnedDaysAgo === undefined ? null : daysAgo(dates.warnedDaysAgo),
    extracted: { companyName: "Acme", title: `Poste ${id}` } as never,
    id,
    rawOfferText: "Offre",
    sourceType: "text",
    status: (dates.status ?? "sent") as never,
    updatedAt: daysAgo(dates.updatedDaysAgo),
    userEmail: USER,
  });
}

async function remainingIds() {
  const rows = await testDatabase.db
    .select({ id: applications.id })
    .from(applications);

  return rows.map((row) => row.id).sort();
}

describe("warnings (US-170)", () => {
  it("warns 15 days before the year, once, whatever the status", async () => {
    await application("FRESH", { updatedDaysAgo: 349 });
    await application("DUE", { updatedDaysAgo: 351 });
    await application("OFFERED", {
      status: "offer_received",
      updatedDaysAgo: 400,
    });
    await application("ALREADY", { updatedDaysAgo: 360, warnedDaysAgo: 5 });

    expect(await store.countDue(cutoffs())).toEqual({ toDelete: 0, toWarn: 2 });
    const warned = await store.claimWarnings(cutoffs(), new Date(NOW));

    expect(warned.map((entry) => entry.id).sort()).toEqual(["DUE", "OFFERED"]);
    expect(warned[0]).toMatchObject({
      companyName: "Acme",
      userEmail: USER,
    });
    expect(await store.claimWarnings(cutoffs(), new Date(NOW))).toEqual([]);
  });

  it("warns again, a year later, about an application changed after its warning", async () => {
    await application("KEPT", { updatedDaysAgo: 360, warnedDaysAgo: 20 });
    // "Garder", three days ago: later than the warning, which it cancels.
    await testDatabase.db
      .update(applications)
      .set({ updatedAt: daysAgo(3) })
      .where(eq(applications.id, "KEPT"));

    expect(await store.countDue(cutoffs())).toEqual({ toDelete: 0, toWarn: 0 });
    // A year after that change, it is due again.
    const later = NOW + 350 * DAY_MS;
    expect(await store.countDue(cutoffs(later))).toEqual({
      toDelete: 0,
      toWarn: 1,
    });
  });
});

describe("deletion (US-170)", () => {
  it("deletes only what was warned 15 days ago and not changed since", async () => {
    await application("GONE", { updatedDaysAgo: 366, warnedDaysAgo: 16 });
    await application("NOTICE_RUNNING", {
      updatedDaysAgo: 400,
      warnedDaysAgo: 10,
    });
    await application("NEVER_WARNED", { updatedDaysAgo: 400 });
    await application("UNDER_A_YEAR", {
      updatedDaysAgo: 364,
      warnedDaysAgo: 16,
    });
    await application("CHANGED_SINCE", {
      updatedDaysAgo: 366,
      warnedDaysAgo: 380,
    });

    expect((await store.countDue(cutoffs())).toDelete).toBe(1);
    expect((await store.deleteDue(cutoffs())).applications).toBe(1);
    expect(await remainingIds()).toEqual(
      [
        "CHANGED_SINCE",
        "NEVER_WARNED",
        "NOTICE_RUNNING",
        "UNDER_A_YEAR",
      ].sort(),
    );
  });

  it("leaves no row behind in the tables tied to the application", async () => {
    await application("GONE", { updatedDaysAgo: 400, warnedDaysAgo: 20 });
    await application("STAYS", { updatedDaysAgo: 10 });
    const db = testDatabase.db;
    for (const id of ["GONE", "STAYS"]) {
      await db.insert(applicationCvVersions).values({
        applicationId: id,
        content: {} as never,
        createdAt: daysAgo(400),
        id: `cv-${id}`,
        source: "generation",
        versionNumber: 1,
      });
      await db.insert(applicationLetterVersions).values({
        applicationId: id,
        content: {} as never,
        createdAt: daysAgo(400),
        id: `letter-${id}`,
        source: "generation",
        versionNumber: 1,
      });
      await db.insert(interviewSessions).values({
        aiStatus: "idle" as never,
        applicationId: id,
        createdAt: daysAgo(400),
        id: `session-${id}`,
        profile: "rh" as never,
        status: "completed" as never,
        updatedAt: daysAgo(400),
        userEmail: USER,
      });
      await db.insert(interviewChunks).values({
        chunkId: "c1",
        createdAt: daysAgo(400),
        endedAt: daysAgo(400),
        sequence: 1,
        sessionId: `session-${id}`,
        startedAt: daysAgo(400),
        status: "completed" as never,
      });
      await db.insert(notifications).values({
        id: `note-${id}`,
        message: "Relancer",
        metadata: { applicationId: id },
        title: "Relancer Acme",
        type: "application_follow_up",
        userEmail: USER,
      });
    }
    const [job] = await db
      .insert(jobs)
      .values({ title: "Poste", titleKey: "poste" })
      .returning();
    await db.insert(jobMatches).values({
      applicationId: "GONE",
      digestDate: "2025-09-01",
      jobId: job!.id,
      profileId: "p1",
      score: 80,
      status: "applied",
      userEmail: USER,
    });

    expect(await store.deleteDue(cutoffs())).toEqual({
      applications: 1,
      interviewSessions: 1,
      matchesDetached: 1,
      notifications: 1,
    });

    expect(await remainingIds()).toEqual(["STAYS"]);
    for (const [table, column] of [
      [applicationCvVersions, applicationCvVersions.applicationId],
      [applicationLetterVersions, applicationLetterVersions.applicationId],
      [interviewSessions, interviewSessions.applicationId],
    ] as const) {
      expect(await db.select().from(table).where(eq(column, "GONE"))).toEqual(
        [],
      );
    }
    expect(
      await db
        .select()
        .from(interviewChunks)
        .where(eq(interviewChunks.sessionId, "session-GONE")),
    ).toEqual([]);
    expect(
      (await db.select().from(notifications)).map((row) => row.id),
    ).toEqual(["note-STAYS"]);
    // The offer stays, for the job purge to decide (US-169); the match lets go.
    const [match] = await db.select().from(jobMatches);
    expect(match?.applicationId).toBeNull();
    expect(await db.select().from(interviewSessions)).toHaveLength(1);
  });
});

describe("activity (US-170)", () => {
  it("does not count an opening, and shows when a warned application goes", async () => {
    await application("WARNED", { updatedDaysAgo: 360, warnedDaysAgo: 1 });
    const applicationsStore = new PgApplicationsStore(testDatabase.db);

    const opened = await applicationsStore.findByIdForUserEmail(USER, "WARNED");
    await applicationsStore.listByUserEmail(USER);

    const [row] = await testDatabase.db.select().from(applications);
    expect(row?.updatedAt.toISOString()).toBe(daysAgo(360).toISOString());
    // A year after the change (in 5 days), but never sooner than 15 days
    // after the warning: in 14 days.
    expect(opened?.deletionScheduledAt).toBe(
      new Date(daysAgo(1).getTime() + 15 * DAY_MS).toISOString(),
    );
  });

  it("keeps the warning when the application is saved, and drops it once changed", async () => {
    await application("WARNED", { updatedDaysAgo: 360, warnedDaysAgo: 1 });
    const applicationsStore = new PgApplicationsStore(testDatabase.db);
    const stored = (await applicationsStore.findByIdForUserEmail(
      USER,
      "WARNED",
    ))!;

    // A save that is not a change (the company context cache) keeps it.
    await applicationsStore.save({ ...stored, companyContext: null });
    expect(
      (await applicationsStore.findByIdForUserEmail(USER, "WARNED"))
        ?.deletionScheduledAt,
    ).not.toBeNull();

    await applicationsStore.save({
      ...stored,
      updatedAt: new Date(NOW).toISOString(),
    });
    expect(
      (await applicationsStore.findByIdForUserEmail(USER, "WARNED"))
        ?.deletionScheduledAt,
    ).toBeNull();
    expect(await store.countDue(cutoffs())).toEqual({ toDelete: 0, toWarn: 0 });
  });
});
