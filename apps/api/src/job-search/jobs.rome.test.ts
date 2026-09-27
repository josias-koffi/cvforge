import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import type { NormalizedJobListing } from "./job-search.types";
import { PgJobsStore } from "./jobs.pg-store";

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

const SKILL = {
  code: "109846",
  label: "Concevoir une application web",
  required: false,
};

function makeListing(
  overrides: Partial<NormalizedJobListing> = {},
): NormalizedJobListing {
  return {
    applyUrl: "",
    companyAnonymous: false,
    companyName: "ACME",
    contractType: "cdi",
    department: "44",
    description: "Une annonce.",
    externalId: "ft-1",
    latitude: null,
    locationLabel: "Nantes",
    longitude: null,
    partnerUrls: [],
    publishedAt: "2026-09-20T08:00:00.000Z",
    raw: {},
    remote: false,
    salaryLabel: "",
    source: "france_travail",
    title: "Développeur web",
    url: "https://candidat.francetravail.fr/offres/recherche/detail/ft-1",
    ...overrides,
  };
}

async function romeOf(table: "jobs" | "job_listings") {
  const result = (await testDatabase.db.execute(
    sql.raw(
      `select rome_code, rome_competences${table === "job_listings" ? ", rome_appellation" : ""} from ${table} order by rome_code`,
    ),
  )) as unknown as {
    rows: Array<{
      rome_code: string | null;
      rome_competences: unknown;
      rome_appellation?: string | null;
    }>;
  };

  return result.rows;
}

describe("ROME job of stored offers (US-124)", () => {
  it("keeps the code, the appellation and the skills on the advert and the job", async () => {
    const listing = makeListing({
      rome: {
        appellationLabel: "Développeur / Développeuse web",
        code: "M1855",
        competences: [SKILL],
      },
    });
    const job = await store.createJob(listing);
    await store.attachListing({ jobId: job.id, listing, matchMethod: "new" });

    expect(await romeOf("jobs")).toEqual([
      { rome_code: "M1855", rome_competences: [SKILL] },
    ]);
    expect(await romeOf("job_listings")).toEqual([
      {
        rome_appellation: "Développeur / Développeuse web",
        rome_code: "M1855",
        rome_competences: [SKILL],
      },
    ]);
  });

  it("stores nothing for an advert without a ROME job", async () => {
    const listing = makeListing();
    const job = await store.createJob(listing);
    await store.attachListing({ jobId: job.id, listing, matchMethod: "new" });

    expect(await romeOf("jobs")).toEqual([
      { rome_code: null, rome_competences: [] },
    ]);
    expect(await romeOf("job_listings")).toEqual([
      { rome_appellation: null, rome_code: null, rome_competences: [] },
    ]);
  });

  it("lets a later advert fill a job that had no ROME job, never overwrite one", async () => {
    const bare = makeListing({ source: "greenhouse", externalId: "gh-1" });
    const job = await store.createJob(bare);
    await store.attachListing({
      jobId: job.id,
      listing: bare,
      matchMethod: "new",
    });

    await store.attachListing({
      jobId: job.id,
      listing: makeListing({
        rome: { appellationLabel: "", code: "M1855", competences: [SKILL] },
      }),
      matchMethod: "url",
    });
    await store.attachListing({
      jobId: job.id,
      listing: makeListing({
        externalId: "lba-1",
        rome: { appellationLabel: "", code: "M1805", competences: [] },
        source: "la_bonne_alternance",
      }),
      matchMethod: "url",
    });

    expect(await romeOf("jobs")).toEqual([
      { rome_code: "M1855", rome_competences: [SKILL] },
    ]);
  });

  it("keeps the ROME job when an admin detaches an advert", async () => {
    const first = makeListing({ externalId: "a" });
    const second = makeListing({
      externalId: "b",
      rome: { appellationLabel: "", code: "M1805", competences: [SKILL] },
    });
    const job = await store.createJob(first);
    await store.attachListing({
      jobId: job.id,
      listing: first,
      matchMethod: "new",
    });
    const attached = await store.attachListing({
      jobId: job.id,
      listing: second,
      matchMethod: "fuzzy",
    });

    const detached = await store.detachListing(attached.id);
    const result = (await testDatabase.db.execute(
      sql`select rome_code, rome_competences from jobs where id = ${detached!.id}`,
    )) as unknown as {
      rows: Array<{ rome_code: string; rome_competences: unknown }>;
    };

    expect(result.rows).toEqual([
      { rome_code: "M1805", rome_competences: [SKILL] },
    ]);
    // Known limit: the job it leaves keeps the ROME job it had learned from
    // it — not recomputed on a detach, a rare admin correction.
  });
});
