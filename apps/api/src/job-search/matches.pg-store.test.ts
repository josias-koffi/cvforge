import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { JobDeduplicator } from "./dedup/job-deduplicator";
import type { NormalizedJobListing } from "./job-search.types";
import { PgJobsStore } from "./jobs.pg-store";
import { PgJobMatchesStore } from "./matches.pg-store";
import type { NewJobMatch } from "./matches.types";

let testDatabase: TestDatabase;
let jobsStore: PgJobsStore;
let matches: PgJobMatchesStore;
let deduplicator: JobDeduplicator;

const USER = "ada@example.com";
const DAY = "2026-10-01";

beforeAll(async () => {
  testDatabase = await createTestDatabase();
  jobsStore = new PgJobsStore(testDatabase.db);
  matches = new PgJobMatchesStore(testDatabase.db);
  deduplicator = new JobDeduplicator(jobsStore);
});

afterAll(async () => {
  await testDatabase.close();
});

beforeEach(async () => {
  await testDatabase.reset();
});

async function proposed(externalId: string, title: string) {
  const attached = await deduplicator.attach({
    applyUrl: "",
    companyAnonymous: false,
    companyName: `Entreprise ${externalId}`,
    contractType: "cdi",
    department: "44",
    description: `${title} à Nantes.`,
    externalId,
    latitude: null,
    locationLabel: "Nantes",
    longitude: null,
    partnerUrls: [],
    publishedAt: "2026-09-30T08:00:00.000Z",
    raw: {},
    remote: false,
    salaryLabel: "",
    source: "france_travail",
    title,
    url: `https://example.com/${externalId}`,
  } as NormalizedJobListing);
  const job = (await jobsStore.findById(attached.jobId))!.job;
  const match: NewJobMatch = {
    digestDate: DAY,
    jobId: job.id,
    jobSnapshot: job,
    matchedSkills: [],
    missingSkills: [],
    profileId: "p1",
    score: 80,
    scoreBreakdown: {} as NewJobMatch["scoreBreakdown"],
    userEmail: USER,
  };
  await matches.createMany([match]);

  return (await matches.listByDigestDate(USER, DAY)).find(
    (entry) => entry.jobId === job.id,
  )!;
}

describe("PgJobMatchesStore", () => {
  it("drops an offer withdrawn at the source, unless the candidate kept it (US-163)", async () => {
    await proposed("OPEN", "Développeur");
    await proposed("GONE", "Comptable");
    const kept = await proposed("KEPT", "Juriste");
    await matches.setStatus(USER, kept.id, "saved");

    const closedAt = new Date().toISOString();
    await jobsStore.closeListing("france_travail", "GONE", closedAt);
    await jobsStore.closeListing("france_travail", "KEPT", closedAt);

    const titles = async (list: Promise<Array<{ job: { title: string } }>>) =>
      (await list).map((entry) => entry.job.title).sort();

    expect(await titles(matches.listByDigestDate(USER, DAY))).toEqual([
      "Développeur",
      "Juriste",
    ]);
    expect(await titles(matches.listRecent(USER, 10))).toEqual([
      "Développeur",
      "Juriste",
    ]);
  });
});
