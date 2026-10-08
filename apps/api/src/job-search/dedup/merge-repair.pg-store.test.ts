import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { jobListings } from "../../database/schema";
import {
  createTestDatabase,
  type TestDatabase,
} from "../../database/testing/test-database";
import { advert } from "../job-retention.testing";
import { PgJobsStore } from "../jobs.pg-store";
import { repairMerges } from "./merge-repair.pg-store";

let testDatabase: TestDatabase;
let store: PgJobsStore;

beforeAll(async () => {
  testDatabase = await createTestDatabase();
  store = new PgJobsStore(testDatabase.db);
});

afterAll(async () => {
  await testDatabase.close();
});

beforeEach(async () => {
  await testDatabase.reset();
});

/** Two unrelated adverts merged as the old route-less Beetween key did. */
async function wrongMerge() {
  const opener = advert("1", {
    raw: {
      origineOffre: {
        partenaires: [
          { url: "https://app.beetween.com/WeaselWeb/p/#/apply/job/aaa/cvc" },
        ],
      },
    },
    title: "Ingénieur CVC (H/F)",
  });
  const chef = advert("2", {
    department: "21",
    raw: {
      origineOffre: {
        partenaires: [
          { url: "https://app.beetween.com/WeaselWeb/p/#/apply/job/bbb/chef" },
        ],
      },
    },
    title: "Chef de rang (H/F)",
  });
  const job = await store.createJob(opener);
  await store.attachListing({
    jobId: job.id,
    listing: opener,
    matchMethod: "new",
  });
  await store.attachListing({
    jobId: job.id,
    listing: chef,
    matchMethod: "url",
  });

  return job.id;
}

async function jobOf(externalId: string) {
  const [row] = await testDatabase.db
    .select({ jobId: jobListings.jobId })
    .from(jobListings)
    .where(eq(jobListings.externalId, externalId));

  return row?.jobId;
}

describe("repairMerges", () => {
  it("counts in a dry run and moves nothing", async () => {
    const jobId = await wrongMerge();

    const stats = await repairMerges(testDatabase.db, store, { dryRun: true });

    expect(stats).toMatchObject({
      jobsChecked: 1,
      jobsSplit: 1,
      listingsDetached: 1,
    });
    expect(stats.examples).toEqual([
      { detached: ["Chef de rang (H/F)"], jobId },
    ]);
    expect(await jobOf("2")).toBe(jobId);
  });

  it("gives the advert that does not belong a job of its own", async () => {
    const jobId = await wrongMerge();

    await repairMerges(testDatabase.db, store, { dryRun: false });

    expect(await jobOf("1")).toBe(jobId);
    expect(await jobOf("2")).not.toBe(jobId);
    expect(
      (await repairMerges(testDatabase.db, store, { dryRun: false }))
        .jobsChecked,
    ).toBe(0);
  });
});
