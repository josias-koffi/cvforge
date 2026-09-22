import { ATS_SCORE_ENGINE_VERSION, type AtsScoreResult } from "@cvforge/ats-score";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { PgAtsScanStore } from "./ats.pg-store";
import type { NewAtsScan } from "./ats.types";

function makeResult(overrides: Partial<AtsScoreResult> = {}): AtsScoreResult {
  return {
    band: "good",
    dimensions: [
      { key: "structure", score: 80, status: "scored" },
      { key: "keywords", score: null, status: "unavailable", unavailableReason: "NO_OFFER" },
    ],
    engineVersion: ATS_SCORE_ENGINE_VERSION,
    findings: [
      { code: "MISSING_QUANTIFICATION", dimension: "impact", severity: "critical" },
    ],
    llmApplied: false,
    overallScore: 72,
    ...overrides,
  };
}

function makeScan(overrides: Partial<NewAtsScan> = {}): NewAtsScan {
  return {
    expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    ipHash: "a".repeat(64),
    locale: "fr",
    result: makeResult(),
    source: "public",
    ...overrides,
  };
}

describe("PgAtsScanStore", () => {
  let testDatabase: TestDatabase;
  let store: PgAtsScanStore;

  beforeAll(async () => {
    testDatabase = await createTestDatabase();
    store = new PgAtsScanStore(testDatabase.db);
  });

  afterAll(async () => {
    await testDatabase.close();
  });

  beforeEach(async () => {
    await testDatabase.reset();
  });

  it("round-trips a scan through real SQL", async () => {
    const created = await store.create(makeScan());
    const read = await store.findById(created.id);

    expect(read).toEqual(created);
    expect(read?.overallScore).toBe(72);
    expect(read?.result.findings[0]?.code).toBe("MISSING_QUANTIFICATION");
    expect(read?.engineVersion).toBe(ATS_SCORE_ENGINE_VERSION);
  });

  it("denormalises the score and the engine version out of the result", async () => {
    const created = await store.create(
      makeScan({ result: makeResult({ overallScore: 41 }) }),
    );

    expect(created.overallScore).toBe(41);
  });

  it("starts unlocked-less, with no email", async () => {
    const created = await store.create(makeScan());

    expect(created.email).toBeNull();
    expect(created.unlockedAt).toBeNull();
  });

  it("returns null for an id it does not hold", async () => {
    expect(
      await store.findById("00000000-0000-4000-8000-000000000000"),
    ).toBeNull();
  });

  describe("the daily budget count", () => {
    it("counts the scans created inside the window", async () => {
      await store.create(makeScan());
      await store.create(makeScan());

      const since = new Date(Date.now() - 3600 * 1000).toISOString();

      expect(await store.countSince(since)).toBe(2);
    });

    it("ignores scans older than the window", async () => {
      await store.create(makeScan());

      const since = new Date(Date.now() + 3600 * 1000).toISOString();

      expect(await store.countSince(since)).toBe(0);
    });
  });

  describe("unlocking", () => {
    it("attaches the email and stamps the moment", async () => {
      const created = await store.create(makeScan());
      const at = new Date().toISOString();

      const unlocked = await store.unlock(created.id, "lead@example.com", at);

      expect(unlocked?.email).toBe("lead@example.com");
      expect(unlocked?.unlockedAt).not.toBeNull();
    });

    /**
     * A replayed unlock must not be a way to redirect a report to another
     * address, so only the first one writes.
     */
    it("refuses to unlock a scan twice", async () => {
      const created = await store.create(makeScan());
      const at = new Date().toISOString();

      await store.unlock(created.id, "first@example.com", at);
      const second = await store.unlock(created.id, "attacker@example.com", at);

      expect(second).toBeNull();
      expect((await store.findById(created.id))?.email).toBe(
        "first@example.com",
      );
    });

    it("returns null for an unknown scan", async () => {
      expect(
        await store.unlock(
          "00000000-0000-4000-8000-000000000000",
          "lead@example.com",
          new Date().toISOString(),
        ),
      ).toBeNull();
    });
  });

  describe("retention", () => {
    it("deletes scans past their deadline and keeps the rest", async () => {
      const expired = await store.create(
        makeScan({ expiresAt: new Date(Date.now() - 1000).toISOString() }),
      );
      const live = await store.create(makeScan());

      const deleted = await store.deleteExpired(new Date().toISOString());

      expect(deleted).toBe(1);
      expect(await store.findById(expired.id)).toBeNull();
      expect(await store.findById(live.id)).not.toBeNull();
    });
  });

  describe("what the schema refuses", () => {
    it("rejects a score outside 0-100", async () => {
      await expect(
        store.create(makeScan({ result: makeResult({ overallScore: 140 }) })),
      ).rejects.toThrow();
    });

    it("rejects an unknown source", async () => {
      await expect(
        store.create(makeScan({ source: "elsewhere" as never })),
      ).rejects.toThrow();
    });
  });
});
