import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  applicationCvVersions,
  applications,
  atsScans,
  authAccounts,
} from "../database/schema";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { PgMetricsStore } from "./metrics.pg-store";

const NOW = new Date();

async function seedApplication(db: TestDatabase["db"], id: string) {
  await db.insert(applications).values({
    createdAt: NOW,
    extracted: {} as never,
    id,
    sourceType: "text",
    status: "draft",
    updatedAt: NOW,
    userEmail: "user@example.com",
  });
}

async function seedVersion(
  db: TestDatabase["db"],
  applicationId: string,
  versionNumber: number,
  atsScore: number | null,
  atsEngineVersion: string | null,
) {
  await db.insert(applicationCvVersions).values({
    applicationId,
    atsEngineVersion,
    atsScore,
    content: {} as never,
    createdAt: NOW,
    id: `${applicationId}-cv-v${versionNumber}`,
    source: "generation",
    versionNumber,
  });
}

async function seedScan(
  db: TestDatabase["db"],
  id: string,
  email: string | null,
) {
  await db.insert(atsScans).values({
    engineVersion: "1.1.0",
    expiresAt: new Date(Date.now() + 86_400_000),
    id,
    overallScore: 70,
    result: {} as never,
    source: "public",
    ...(email ? { email, unlockedAt: NOW } : {}),
  });
}

describe("PgMetricsStore — ATS counters", () => {
  let testDatabase: TestDatabase;
  let store: PgMetricsStore;

  beforeAll(async () => {
    testDatabase = await createTestDatabase();
    store = new PgMetricsStore(testDatabase.db);
  });

  afterAll(async () => {
    await testDatabase.close();
  });

  beforeEach(async () => {
    await testDatabase.reset();
  });

  it("reports zeroes on an empty database", async () => {
    const counters = await store.readAtsCounters();

    expect(counters).toEqual({
      convertedLeadCount: 0,
      publicScanCount: 0,
      scoresByEngine: [],
      unlockedScanCount: 0,
    });
  });

  /**
   * The point of the whole grouping: the scale is versioned, so a mean pooling
   * 1.0.0 with 1.1.0 would measure the rescale rather than the CVs.
   */
  it("averages scores per engine version, never across them", async () => {
    await seedApplication(testDatabase.db, "app-1");
    await seedVersion(testDatabase.db, "app-1", 1, 40, "1.0.0");
    await seedVersion(testDatabase.db, "app-1", 2, 60, "1.0.0");
    await seedVersion(testDatabase.db, "app-1", 3, 90, "1.1.0");

    const { scoresByEngine } = await store.readAtsCounters();
    const byVersion = Object.fromEntries(
      scoresByEngine.map((row) => [row.engineVersion, row]),
    );

    expect(byVersion["1.0.0"]).toEqual({
      averageScore: 50,
      engineVersion: "1.0.0",
      scoredCvCount: 2,
    });
    expect(byVersion["1.1.0"]).toEqual({
      averageScore: 90,
      engineVersion: "1.1.0",
      scoredCvCount: 1,
    });
  });

  /** A CV generated before the feature must never count as a zero. */
  it("ignores versions that were never scored", async () => {
    await seedApplication(testDatabase.db, "app-1");
    await seedVersion(testDatabase.db, "app-1", 1, null, null);
    await seedVersion(testDatabase.db, "app-1", 2, 80, "1.1.0");

    const { scoresByEngine } = await store.readAtsCounters();

    expect(scoresByEngine).toEqual([
      { averageScore: 80, engineVersion: "1.1.0", scoredCvCount: 1 },
    ]);
  });

  it("counts public scans and how many were unlocked", async () => {
    await seedScan(testDatabase.db, "11111111-1111-4111-8111-111111111111", null);
    await seedScan(testDatabase.db, "22222222-2222-4222-8222-222222222222", null);
    await seedScan(
      testDatabase.db,
      "33333333-3333-4333-8333-333333333333",
      "lead@example.com",
    );

    const counters = await store.readAtsCounters();

    expect(counters.publicScanCount).toBe(3);
    expect(counters.unlockedScanCount).toBe(1);
  });

  /**
   * A lead counts as converted once its address has an account. The join is
   * made at read time — neither side owns the other.
   */
  it("counts a lead as converted once it has an account", async () => {
    await seedScan(
      testDatabase.db,
      "44444444-4444-4444-8444-444444444444",
      "converted@example.com",
    );
    await seedScan(
      testDatabase.db,
      "55555555-5555-4555-8555-555555555555",
      "stranger@example.com",
    );
    await testDatabase.db.insert(authAccounts).values({
      createdAt: NOW,
      email: "converted@example.com",
      role: "user",
      status: "active",
    });

    const counters = await store.readAtsCounters();

    expect(counters.convertedLeadCount).toBe(1);
  });

  it("counts one lead who scanned twice only once", async () => {
    await seedScan(
      testDatabase.db,
      "66666666-6666-4666-8666-666666666666",
      "lead@example.com",
    );
    await seedScan(
      testDatabase.db,
      "77777777-7777-4777-8777-777777777777",
      "lead@example.com",
    );
    await testDatabase.db.insert(authAccounts).values({
      createdAt: NOW,
      email: "lead@example.com",
      role: "user",
      status: "active",
    });

    expect((await store.readAtsCounters()).convertedLeadCount).toBe(1);
  });
});
