import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { jobListings, jobs } from "../database/schema";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { JobDeduplicator } from "./dedup/job-deduplicator";
import { PgJobRetentionStore } from "./job-retention.pg-store";
import { advert, jobRow } from "./job-retention.testing";
import { PgJobsStore } from "./jobs.pg-store";
import type { NormalizedJobListing } from "./job-search.types";
import { BoardHttpClient } from "./sources/boards/board-http";
import { GreenhouseBoard } from "./sources/boards/greenhouse.board";
import {
  toNormalizedListing,
  type FranceTravailOffer,
} from "./sources/france-travail.mapper";

/** A real France Travail answer; only the recruiter's details are made up. */
const FRANCE_TRAVAIL_OFFER = fixture<FranceTravailOffer>(
  "france-travail-offer.json",
);
const GREENHOUSE_JOB = fixture<Record<string, unknown>>("greenhouse-job.json");

let testDatabase: TestDatabase;
let jobsStore: PgJobsStore;
let retention: PgJobRetentionStore;
let deduplicator: JobDeduplicator;

beforeAll(async () => {
  testDatabase = await createTestDatabase();
  jobsStore = new PgJobsStore(testDatabase.db);
  retention = new PgJobRetentionStore(testDatabase.db);
  deduplicator = new JobDeduplicator(jobsStore);
});

afterAll(async () => {
  await testDatabase.close();
});

beforeEach(async () => {
  await testDatabase.reset();
});

function fixture<T>(name: string): T {
  return JSON.parse(
    readFileSync(resolve(__dirname, "__fixtures__", name), "utf8"),
  ) as T;
}

async function greenhouseListing(): Promise<NormalizedJobListing> {
  const fetchImpl = vi.fn(
    async () => new Response(JSON.stringify({ jobs: [GREENHOUSE_JOB] })),
  );
  const client = new BoardHttpClient(
    fetchImpl as unknown as typeof globalThis.fetch,
    () => 0,
    5_000,
    async () => {},
  );
  const [listing] = await new GreenhouseBoard(client).fetchBoard("doctolib");

  return listing!;
}

async function listingRow(source: string, externalId: string) {
  const [row] = await testDatabase.db
    .select()
    .from(jobListings)
    .where(eq(jobListings.externalId, externalId));
  expect(row?.source).toBe(source);

  return row!;
}

describe("anonymization at closing (US-169)", () => {
  it("strips the recruiter and the company from a real France Travail answer", async () => {
    const listing = toNormalizedListing(FRANCE_TRAVAIL_OFFER)!;
    const { jobId } = await deduplicator.attach(listing);

    await jobsStore.closeListing(
      "france_travail",
      "213ZHWP",
      new Date().toISOString(),
    );

    const row = await listingRow("france_travail", "213ZHWP");
    const raw = row.raw as Record<string, unknown>;
    expect(raw.contact).toBeUndefined();
    expect(raw.agence).toBeUndefined();
    expect(raw.entreprise).toEqual({ entrepriseAdaptee: false });
    expect(JSON.stringify(raw)).not.toMatch(
      /DUPONT|recrutement@|01 23 45|G2F CONSEIL :|g2f-conseil\.com/,
    );
    // The offer itself is untouched: only who publishes it goes.
    expect(raw.intitule).toBe(FRANCE_TRAVAIL_OFFER.intitule);
    expect(raw.description).toBe(FRANCE_TRAVAIL_OFFER.description);
    expect(row).toMatchObject({ companyAnonymous: true, companyName: "" });
    expect(row.anonymizedAt).not.toBeNull();

    expect(await jobRow(testDatabase.db, jobId)).toMatchObject({
      companyAnonymous: true,
      companyKey: "",
      companyLogoUrl: "",
      companyName: "",
    });
  });

  it("strips the company from a careers site advert closed by a collection", async () => {
    const listing = await greenhouseListing();
    const { jobId } = await deduplicator.attach(listing);
    expect(
      (await listingRow("greenhouse", listing.externalId)).companyName,
    ).toBe("Doctolib");

    await jobsStore.closeListingsMissingFrom({
      at: new Date().toISOString(),
      seenExternalIds: [],
      source: "greenhouse",
    });

    const raw = (await listingRow("greenhouse", listing.externalId))
      .raw as Record<string, unknown>;
    expect(raw.company_name).toBeUndefined();
    expect(raw.title).toBe(GREENHOUSE_JOB.title);
    expect((await jobRow(testDatabase.db, jobId))?.companyName).toBe("");
  });

  it("leaves the job as it is while another of its adverts is open", async () => {
    const first = await deduplicator.attach(
      advert("A1", { url: "https://acme.fr/1" }),
    );
    await deduplicator.attach(
      advert("A2", { source: "la_bonne_alternance", url: "https://acme.fr/1" }),
    );

    await jobsStore.closeListing(
      "france_travail",
      "A1",
      new Date().toISOString(),
    );

    expect((await listingRow("france_travail", "A1")).raw).toEqual({
      entreprise: {},
    });
    expect(await jobRow(testDatabase.db, first.jobId)).toMatchObject({
      anonymizedAt: null,
      closedAt: null,
      companyName: "Entreprise A1",
    });
  });

  it("gives an offer that comes back its company again", async () => {
    const { jobId } = await deduplicator.attach(advert("BACK"));
    await jobsStore.closeListing(
      "france_travail",
      "BACK",
      new Date().toISOString(),
    );

    await deduplicator.attach(advert("BACK"));

    const row = await listingRow("france_travail", "BACK");
    expect(row).toMatchObject({
      anonymizedAt: null,
      closedAt: null,
      companyName: "Entreprise BACK",
    });
    expect(row.raw).toMatchObject({ contact: { courriel: "rh@example.fr" } });
    expect(await jobRow(testDatabase.db, jobId)).toMatchObject({
      anonymizedAt: null,
      companyAnonymous: false,
      companyName: "Entreprise BACK",
    });
  });

  it("catches up with the adverts closed before US-169, once", async () => {
    const { jobId } = await deduplicator.attach(advert("OLD"));
    // Closed the way it was before: no anonymization.
    await testDatabase.db.update(jobListings).set({ closedAt: new Date() });
    await testDatabase.db.update(jobs).set({ closedAt: new Date() });

    expect(await retention.countToAnonymize()).toEqual({
      jobs: 1,
      listings: 1,
    });
    expect(await retention.anonymizeClosed()).toEqual({ jobs: 1, listings: 1 });
    expect(await retention.anonymizeClosed()).toEqual({ jobs: 0, listings: 0 });
    expect((await jobRow(testDatabase.db, jobId))?.companyName).toBe("");
  });
});
