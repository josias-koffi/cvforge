import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { PgMarketStore } from "../metrics/market/market.pg-store";
import {
  PgAlertMatchesStore,
  type NewAlertMatch,
} from "./alert-matches.pg-store";
import { JobDeduplicator } from "./dedup/job-deduplicator";
import type { NormalizedJobListing } from "./job-search.types";
import { PgJobsStore } from "./jobs.pg-store";
import { PgJobMatchesStore } from "./matches.pg-store";
import type { NewJobMatch } from "./matches.types";

const USER = "ada@example.com";
let testDatabase: TestDatabase;
let jobsStore: PgJobsStore;
let alerts: PgAlertMatchesStore;
let matches: PgJobMatchesStore;
let deduplicator: JobDeduplicator;

beforeAll(async () => {
  testDatabase = await createTestDatabase();
  jobsStore = new PgJobsStore(testDatabase.db);
  alerts = new PgAlertMatchesStore(testDatabase.db);
  matches = new PgJobMatchesStore(testDatabase.db);
  deduplicator = new JobDeduplicator(jobsStore);
});

afterAll(async () => {
  await testDatabase.close();
});

beforeEach(async () => {
  await testDatabase.reset();
});

async function storedJob(externalId: string) {
  const attached = await deduplicator.attach({
    applyUrl: "",
    companyAnonymous: false,
    companyName: `Entreprise ${externalId}`,
    contractType: "cdi",
    department: "44",
    description: "Développeur à Nantes.",
    externalId,
    latitude: null,
    locationLabel: "Nantes",
    longitude: null,
    partnerUrls: [],
    publishedAt: null,
    raw: {},
    remote: false,
    salaryLabel: "",
    source: "france_travail",
    title: `Développeur ${externalId}`,
    url: `https://example.com/${externalId}`,
  } as NormalizedJobListing);

  return (await jobsStore.findById(attached.jobId))!.job;
}

function proposal(
  job: Awaited<ReturnType<typeof storedJob>>,
  digestDate: string,
): NewJobMatch {
  return {
    digestDate,
    jobId: job.id,
    jobSnapshot: job,
    matchedSkills: [],
    missingSkills: [],
    profileId: "p1",
    score: 70,
    scoreBreakdown: {} as NewJobMatch["scoreBreakdown"],
    userEmail: USER,
  };
}

function alertFor(
  job: Awaited<ReturnType<typeof storedJob>>,
  overrides: Partial<NewAlertMatch> = {},
): NewAlertMatch {
  return {
    ...proposal(job, "2026-10-01"),
    detectedAt: "2026-10-01T09:05:00.000Z",
    publishedAt: "2026-10-01T09:00:00.000Z",
    score: 92,
    source: "france_travail",
    ...overrides,
  };
}

describe("alert matches and the morning recap (US-165)", () => {
  it("keeps an offer sent as an alert out of the next morning", async () => {
    const job = await storedJob("SENT");
    const id = await alerts.createAlert(alertFor(job));
    await alerts.markAlertSent([id!], "2026-10-01T09:06:00.000Z");

    expect(await matches.listProposedJobIds(USER)).toEqual([job.id]);
    expect(await matches.createMany([proposal(job, "2026-10-02")])).toBe(0);
    expect((await matches.findByJobId(USER, job.id))?.digestDate).toBe(
      "2026-10-01",
    );
  });

  it("lets the morning take over an alert that never went out", async () => {
    const job = await storedJob("PENDING");
    await alerts.createAlert(alertFor(job));

    expect(await matches.listProposedJobIds(USER)).toEqual([]);
    expect(await matches.createMany([proposal(job, "2026-10-02")])).toBe(1);

    const [row] = await testDatabase.db.query.jobMatches.findMany();
    expect(row).toMatchObject({
      digestDate: "2026-10-02",
      kind: "digest",
      score: 70,
    });
    // The dates stay: the delay of that offer is still measured.
    expect(row?.publishedAt?.toISOString()).toBe("2026-10-01T09:00:00.000Z");
  });

  it("never raises an alert for an offer already proposed", async () => {
    const job = await storedJob("MORNING");
    await matches.createMany([proposal(job, "2026-10-01")]);

    expect(await alerts.createAlert(alertFor(job))).toBeNull();
  });
});

describe("PgMarketStore.readAlertDelays", () => {
  it("gives the median and the 90th percentile per source, in minutes", async () => {
    const market = new PgMarketStore(testDatabase.db);
    const createdAt = "2026-10-01T10:00:00.000Z";
    const delays = [2, 4, 6, 8, 30];

    for (const [index, minutes] of delays.entries()) {
      const job = await storedJob(`FT${index}`);
      await alerts.createAlert(
        alertFor(job, {
          publishedAt: new Date(
            Date.parse(createdAt) - minutes * 60_000,
          ).toISOString(),
          userEmail: `user${index}@example.com`,
        }),
      );
    }
    const board = await storedJob("GH1");
    await alerts.createAlert(
      alertFor(board, { publishedAt: null, source: "greenhouse" }),
    );
    await testDatabase.db.execute(
      `update job_matches set created_at = '${createdAt}'` as never,
    );

    expect(
      await market.readAlertDelays({
        from: new Date("2026-09-01T00:00:00Z"),
        to: new Date("2026-11-01T00:00:00Z"),
      }),
    ).toEqual([
      {
        alerts: 5,
        medianMinutes: 6,
        p90Minutes: 21.2,
        source: "france_travail",
      },
    ]);
  });
});

describe("PgAlertMatchesStore, for the dispatcher (US-166)", () => {
  it("lists the pending alerts, never one sent or one whose offer closed", async () => {
    const open = await storedJob("OPEN");
    const sent = await storedJob("SENT");
    const closed = await storedJob("CLOSED");
    const openId = await alerts.createAlert(alertFor(open));
    const sentId = await alerts.createAlert(alertFor(sent));
    await alerts.createAlert(alertFor(closed));
    await alerts.markAlertSent([sentId!], new Date().toISOString());
    // Withdrawn at France Travail and caught by the resync: it never goes out.
    await jobsStore.closeListing(
      "france_travail",
      "CLOSED",
      new Date().toISOString(),
    );

    const pending = await alerts.listPending("2000-01-01T00:00:00.000Z", 10);

    expect(pending).toEqual([
      expect.objectContaining({
        detectedAt: "2026-10-01T09:05:00.000Z",
        id: openId,
        publishedAt: "2026-10-01T09:00:00.000Z",
        source: "france_travail",
        title: "Développeur OPEN",
        userEmail: USER,
      }),
    ]);
  });

  it("counts the offers sent on the Paris day, and the last send", async () => {
    const ids = [];
    for (const externalId of ["A", "B", "C"]) {
      ids.push(
        (await alerts.createAlert(alertFor(await storedJob(externalId))))!,
      );
    }
    // 23:30 in Paris on 1 October, then 8:00 and 9:00 on the 2nd.
    await alerts.markAlertSent([ids[0]!], "2026-10-01T21:30:00.000Z");
    await alerts.markAlertSent([ids[1]!], "2026-10-02T06:00:00.000Z");
    await alerts.markAlertSent([ids[2]!], "2026-10-02T07:00:00.000Z");

    const history = await alerts.sendHistory(
      [USER, "nobody@example.com"],
      "2026-10-02",
    );

    expect(history.get(USER)).toEqual({
      lastSentAt: "2026-10-02T07:00:00.000Z",
      sentToday: 2,
    });
    expect(history.has("nobody@example.com")).toBe(false);
  });
});

describe("the paid analysis of the alerts (US-168)", () => {
  const analysis = {
    highlights: ["Vos projets React"],
    reasons: ["Même stack"],
    verdict: "seize" as const,
    watchouts: [],
  };

  it("queues the fresh alerts not analysed yet, with what the model reads", async () => {
    const fresh = await alerts.createAlert(
      alertFor(await storedJob("A1"), { missingSkills: ["Kubernetes"] }),
    );
    await alerts.createAlert(
      alertFor(await storedJob("A2"), {
        detectedAt: "2026-10-01T08:00:00.000Z",
      }),
    );

    const queue = await alerts.listToAnalyse("2026-10-01T09:00:00.000Z", 10);

    expect(queue).toEqual([
      expect.objectContaining({
        id: fresh,
        job: expect.objectContaining({
          description: "Développeur à Nantes.",
          title: "Développeur A1",
        }),
        missingSkills: ["Kubernetes"],
        profileId: "p1",
      }),
    ]);

    await alerts.saveAnalysis(fresh!, {
      analysis,
      at: "2026-10-01T09:06:00.000Z",
      status: "done",
    });
    await expect(
      alerts.listToAnalyse("2026-10-01T09:00:00.000Z", 10),
    ).resolves.toEqual([]);
  });

  it("writes an analysis once, and the pending alert carries it to the dispatcher", async () => {
    const id = await alerts.createAlert(
      alertFor(await storedJob("A1"), { detectedAt: new Date().toISOString() }),
    );

    await alerts.saveAnalysis(id!, {
      analysis,
      at: new Date().toISOString(),
      status: "done",
    });
    await alerts.saveAnalysis(id!, {
      analysis: null,
      at: new Date().toISOString(),
      status: "failed",
    });

    const [pending] = await alerts.listPending(
      new Date(Date.now() - 60_000).toISOString(),
      10,
    );
    expect(pending).toMatchObject({
      aiAnalysis: analysis,
      aiAnalysisStatus: "done",
    });
  });

  it("counts a candidate's analyses of the day, Paris time, failed calls among the attempts", async () => {
    const ids = await Promise.all(
      ["A1", "A2", "A3", "A4"].map(async (id) =>
        alerts.createAlert(alertFor(await storedJob(id))),
      ),
    );
    // 23:30 in Paris on the 1st, then three on the 2nd.
    await alerts.saveAnalysis(ids[0]!, {
      analysis,
      at: "2026-10-01T21:30:00.000Z",
      status: "done",
    });
    await alerts.saveAnalysis(ids[1]!, {
      analysis,
      at: "2026-10-01T22:30:00.000Z",
      status: "done",
    });
    await alerts.saveAnalysis(ids[2]!, {
      analysis: null,
      at: "2026-10-02T08:00:00.000Z",
      status: "failed",
    });
    await alerts.saveAnalysis(ids[3]!, {
      analysis: null,
      at: "2026-10-02T09:00:00.000Z",
      status: "no_credit",
    });

    await expect(alerts.analysesOn(USER, "2026-10-02")).resolves.toEqual({
      attempts: 2,
      done: 1,
    });
    await expect(alerts.analysesOn(USER, "2026-10-01")).resolves.toEqual({
      attempts: 1,
      done: 1,
    });
  });

  it("shows the analysis with the offer in the app, beside it", async () => {
    const job = await storedJob("A1");
    const id = await alerts.createAlert(alertFor(job));
    await alerts.saveAnalysis(id!, {
      analysis,
      at: "2026-10-01T09:06:00.000Z",
      status: "done",
    });

    const shown = await matches.findById(USER, id!);

    expect(shown?.aiAnalysis).toEqual(analysis);
    expect(shown?.job.title).toBe("Développeur A1");
  });
});
