import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createTestDatabase,
  type TestDatabase,
} from "../../database/testing/test-database";
import type { JobSource, NormalizedJobListing } from "../job-search.types";
import { PgJobsStore } from "../jobs.pg-store";
import { JobDeduplicator } from "./job-deduplicator";

let testDatabase: TestDatabase;
let store: PgJobsStore;
let deduplicator: JobDeduplicator;

const ADVERT = `Nous recherchons un développeur full stack pour rejoindre notre équipe produit de 12 personnes.
Vous travaillerez sur notre application React et notre API Node.js en TypeScript. Vous participerez aux
revues de code, à la conception des fonctionnalités et à l'amélioration continue de notre plateforme.
Profil recherché : 3 ans d'expérience minimum en développement web, maîtrise de TypeScript, React et
Node.js, connaissance de PostgreSQL et Docker. Rémunération selon profil, télétravail partiel.`;

beforeAll(async () => {
  testDatabase = await createTestDatabase();
  store = new PgJobsStore(testDatabase.db);
  deduplicator = new JobDeduplicator(store);
});

afterAll(async () => {
  await testDatabase.close();
});

beforeEach(async () => {
  await testDatabase.reset();
});

function makeListing(
  overrides: Partial<NormalizedJobListing> & { source: JobSource; externalId: string },
): NormalizedJobListing {
  return {
    applyUrl: "",
    companyAnonymous: false,
    companyName: "ACME",
    contractType: "cdi",
    department: "75",
    description: ADVERT,
    latitude: null,
    locationLabel: "Paris, France",
    longitude: null,
    partnerUrls: [],
    publishedAt: "2026-09-10T08:00:00.000Z",
    raw: {},
    remote: false,
    salaryLabel: "",
    title: "Développeur Full Stack (H/F)",
    url: "",
    ...overrides,
  };
}

describe("JobDeduplicator", () => {
  it("opens a job for an advert nothing matches", async () => {
    const result = await deduplicator.attach(
      makeListing({
        externalId: "1",
        source: "greenhouse",
        url: "https://job-boards.greenhouse.io/acme/jobs/1",
      }),
    );

    expect(result).toMatchObject({ created: true, method: "new" });

    const found = await store.findById(result.jobId);
    expect(found?.job.title).toBe("Développeur Full Stack (H/F)");
    expect(found?.listings).toHaveLength(1);
  });

  it("merges a France Travail offer that links to the company's own board", async () => {
    const board = await deduplicator.attach(
      makeListing({
        externalId: "1",
        source: "greenhouse",
        url: "https://job-boards.greenhouse.io/acme/jobs/1",
      }),
    );

    // France Travail carries the employer's link, with tracking parameters.
    const franceTravail = await deduplicator.attach(
      makeListing({
        companyName: "ACME SAS",
        externalId: "184XYZQ",
        partnerUrls: ["https://job-boards.greenhouse.io/acme/jobs/1?utm_source=ft"],
        source: "france_travail",
        title: "Developpeur full-stack F/H",
        url: "https://candidat.francetravail.fr/offres/recherche/detail/184XYZQ",
      }),
    );

    expect(franceTravail).toMatchObject({
      created: false,
      jobId: board.jobId,
      method: "url",
    });

    const found = await store.findById(board.jobId);
    expect(found?.listings).toHaveLength(2);
    // Both links are kept: the card shows every source.
    expect(found?.listings.map((listing) => listing.source).sort()).toEqual([
      "france_travail",
      "greenhouse",
    ]);
  });

  it("merges two spellings of the same job at the same company", async () => {
    const first = await deduplicator.attach(
      makeListing({ externalId: "1", source: "france_travail" }),
    );
    const second = await deduplicator.attach(
      makeListing({
        externalId: "2",
        source: "adzuna",
        title: "Developpeur full-stack F/H",
      }),
    );

    expect(second).toMatchObject({ jobId: first.jobId, method: "strict_key" });
  });

  it("keeps two different jobs at the same company apart", async () => {
    const backend = await deduplicator.attach(
      makeListing({
        externalId: "1",
        source: "greenhouse",
        title: "Développeur Back-end",
      }),
    );
    const frontend = await deduplicator.attach(
      makeListing({
        externalId: "2",
        source: "greenhouse",
        title: "Développeur Front-end",
      }),
    );

    expect(frontend.jobId).not.toBe(backend.jobId);
    expect(frontend.created).toBe(true);
  });

  it("prefers the employer's own wording over an aggregator's", async () => {
    const aggregated = await deduplicator.attach(
      makeListing({
        companyName: "ACME",
        description: "Description tronquée…",
        externalId: "1",
        source: "adzuna",
        url: "https://www.adzuna.fr/details/1",
      }),
    );
    await deduplicator.attach(
      makeListing({
        externalId: "2",
        partnerUrls: ["https://www.adzuna.fr/details/1"],
        source: "greenhouse",
        url: "https://job-boards.greenhouse.io/acme/jobs/2",
      }),
    );

    const found = await store.findById(aggregated.jobId);

    expect(found?.job.description).toBe(ADVERT);
    expect(found?.job.primaryUrl).toBe(
      "https://job-boards.greenhouse.io/acme/jobs/2",
    );
  });

  it("keeps the oldest publication date when an offer is reposted", async () => {
    const first = await deduplicator.attach(
      makeListing({
        externalId: "1",
        publishedAt: "2026-07-01T08:00:00.000Z",
        source: "greenhouse",
      }),
    );
    await deduplicator.attach(
      makeListing({
        externalId: "2",
        publishedAt: "2026-09-20T08:00:00.000Z",
        source: "france_travail",
      }),
    );

    const found = await store.findById(first.jobId);

    // The 30-day rule reads this date: a repost must not look new.
    expect(found?.job.publishedAt).toBe("2026-07-01T08:00:00.000Z");
  });

  it("does not re-decide an advert it already holds", async () => {
    const first = await deduplicator.attach(
      makeListing({ externalId: "1", source: "greenhouse" }),
    );
    const again = await deduplicator.attach(
      makeListing({ externalId: "1", source: "greenhouse", title: "Titre corrigé" }),
    );

    expect(again).toMatchObject({ created: false, jobId: first.jobId });

    const found = await store.findById(first.jobId);
    expect(found?.listings).toHaveLength(1);
    expect(found?.job.title).toBe("Titre corrigé");
  });

  describe("closing", () => {
    it("closes the job only once its last advert is closed", async () => {
      const first = await deduplicator.attach(
        makeListing({
          externalId: "1",
          source: "greenhouse",
          url: "https://job-boards.greenhouse.io/acme/jobs/1",
        }),
      );
      await deduplicator.attach(
        makeListing({
          externalId: "2",
          partnerUrls: ["https://job-boards.greenhouse.io/acme/jobs/1"],
          source: "france_travail",
        }),
      );

      await store.closeListing("greenhouse", "1", "2026-09-23T08:00:00.000Z");
      expect((await store.findById(first.jobId))?.job.closedAt).toBeNull();

      await store.closeListing("france_travail", "184", "2026-09-23T08:00:00.000Z");
      await store.closeListing("france_travail", "2", "2026-09-23T08:00:00.000Z");
      expect((await store.findById(first.jobId))?.job.closedAt).not.toBeNull();
    });

    it("closes what a board stopped listing, and reopens it if it comes back", async () => {
      const first = await deduplicator.attach(
        makeListing({ externalId: "1", source: "greenhouse" }),
      );
      await deduplicator.attach(
        makeListing({ externalId: "2", source: "greenhouse", title: "Data Analyst" }),
      );

      const closed = await store.closeListingsMissingFrom({
        at: "2026-09-23T08:00:00.000Z",
        seenExternalIds: ["2"],
        source: "greenhouse",
      });

      expect(closed).toBe(1);
      expect((await store.findById(first.jobId))?.job.closedAt).not.toBeNull();

      await deduplicator.attach(makeListing({ externalId: "1", source: "greenhouse" }));
      expect((await store.findById(first.jobId))?.job.closedAt).toBeNull();
    });
  });

  it("lets an admin undo a wrong merge", async () => {
    const first = await deduplicator.attach(
      makeListing({ externalId: "1", source: "france_travail" }),
    );
    const merged = await deduplicator.attach(
      makeListing({
        externalId: "2",
        source: "adzuna",
        title: "Developpeur full-stack F/H",
      }),
    );
    expect(merged.jobId).toBe(first.jobId);

    const split = await store.detachListing(merged.listing.id);

    expect(split?.id).not.toBe(first.jobId);
    expect((await store.findById(first.jobId))?.listings).toHaveLength(1);
    expect((await store.findById(split!.id))?.listings).toHaveLength(1);
  });

  it("reports what a whole collection did", async () => {
    const report = await deduplicator.attachAll([
      makeListing({ externalId: "1", source: "greenhouse" }),
      makeListing({
        externalId: "2",
        source: "france_travail",
        title: "Developpeur full-stack F/H",
      }),
      makeListing({ externalId: "3", source: "greenhouse", title: "Data Analyst" }),
    ]);

    expect(report).toMatchObject({ jobsCreated: 2, listingsAttached: 3 });
  });
});
