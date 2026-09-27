import {
  ATS_SCORE_ENGINE_VERSION,
  type AtsScoreResult,
} from "@cvforge/ats-score";
import { NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it } from "vitest";
import { AtsReportsService } from "./ats-reports.service";
import { InMemoryAtsScanStore } from "./testing/in-memory-ats-store";

const NOW = Date.parse("2026-09-24T12:00:00.000Z");
const DAY = 86_400_000;

const RESULT: AtsScoreResult = {
  band: "good",
  dimensions: [{ key: "structure", score: 80, status: "scored" }],
  engineVersion: ATS_SCORE_ENGINE_VERSION,
  findings: [],
  llmApplied: false,
  overallScore: 72,
};

describe("AtsReportsService", () => {
  let store: InMemoryAtsScanStore;
  let service: AtsReportsService;

  beforeEach(() => {
    store = new InMemoryAtsScanStore(() => new Date(NOW).toISOString());
    service = new AtsReportsService(store, () => NOW);
  });

  async function seed({
    email = "lead@example.com" as string | null,
    expiresIn = 10 * DAY,
    unlockedAt = "2026-09-20T10:00:00.000Z",
  } = {}) {
    const scan = await store.create({
      expiresAt: new Date(NOW + expiresIn).toISOString(),
      ipHash: null,
      locale: "fr",
      result: RESULT,
      source: "public",
    });

    if (email) await store.unlock(scan.id, email, unlockedAt);

    return scan;
  }

  it("lists the reports this address unlocked, newest first", async () => {
    const older = await seed({ unlockedAt: "2026-09-01T10:00:00.000Z" });
    const newer = await seed({ unlockedAt: "2026-09-20T10:00:00.000Z" });
    await seed({ email: "someone@else.com" });
    await seed({ email: null });
    await seed({ expiresIn: -DAY });

    const scans = await service.list("lead@example.com");

    expect(scans.map((scan) => scan.scanId)).toEqual([newer.id, older.id]);
    expect(scans[0]).toEqual({
      band: "good",
      expiresAt: newer.expiresAt,
      overallScore: 72,
      scanId: newer.id,
      unlockedAt: "2026-09-20T10:00:00.000Z",
    });
  });

  it("returns the full report to the address that unlocked it", async () => {
    const scan = await seed();

    await expect(
      service.get("lead@example.com", scan.id),
    ).resolves.toMatchObject({
      result: RESULT,
      scanId: scan.id,
    });
  });

  /** One answer for all three: telling them apart would confirm a stranger's scan. */
  it.each([
    ["someone else's report", { email: "someone@else.com" }],
    ["a report never unlocked", { email: null }],
    ["an expired report", { expiresIn: -DAY }],
  ])("answers 404 for %s", async (_label, options) => {
    const scan = await seed(options);

    await expect(
      service.get("lead@example.com", scan.id),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("answers 404 for a scan that does not exist", async () => {
    await expect(
      service.get("lead@example.com", "3f2b8c1e-5d4a-4b6f-9a8e-1c2d3e4f5a6b"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
