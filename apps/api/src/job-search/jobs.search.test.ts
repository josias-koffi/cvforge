import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { JobDeduplicator } from "./dedup/job-deduplicator";
import type { JobSource, NormalizedJobListing } from "./job-search.types";
import { PgJobsStore } from "./jobs.pg-store";

let testDatabase: TestDatabase;
let store: PgJobsStore;
let deduplicator: JobDeduplicator;

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
  for (const listing of CATALOGUE) await deduplicator.attach(listing);
});

function makeListing(
  overrides: Partial<NormalizedJobListing> & { source: JobSource; externalId: string },
): NormalizedJobListing {
  return {
    applyUrl: "",
    companyAnonymous: false,
    companyName: "ACME",
    contractType: "cdi",
    department: "44",
    description: "Une annonce ordinaire.",
    latitude: null,
    locationLabel: "Nantes, France",
    longitude: null,
    partnerUrls: [],
    publishedAt: new Date().toISOString(),
    raw: {},
    remote: false,
    salaryLabel: "",
    title: "Poste",
    url: "",
    ...overrides,
  };
}

const CATALOGUE: NormalizedJobListing[] = [
  makeListing({
    companyName: "Doctolib",
    description: "Équipe produit, stack React et Node.js en TypeScript.",
    externalId: "1",
    source: "greenhouse",
    title: "Développeur Full Stack (H/F)",
    url: "https://job-boards.greenhouse.io/doctolib/jobs/1",
  }),
  makeListing({
    companyName: "Swile",
    department: "75",
    description: "API Node.js, PostgreSQL, Docker.",
    externalId: "2",
    locationLabel: "Paris",
    remote: true,
    source: "lever",
    title: "Ingénieur Back-end",
    url: "https://jobs.lever.co/swile/2",
  }),
  makeListing({
    contractType: "alternance",
    description: "Alternance de 24 mois, rythme 3j/2j.",
    externalId: "3",
    source: "france_travail",
    title: "Alternance - Développeur Web",
    url: "https://candidat.francetravail.fr/offres/recherche/detail/3",
  }),
  makeListing({
    companyName: "Sodexo",
    department: "69",
    description: "Cuisine centrale, partie chaude.",
    externalId: "4",
    locationLabel: "Lyon",
    source: "smartrecruiters",
    title: "Chef de partie (H/F)",
    url: "https://careers.smartrecruiters.com/Sodexo/4",
  }),
];

const BASE = {
  contractTypes: [],
  departments: [],
  limit: 20,
  maxAgeDays: 30,
  offset: 0,
  query: "",
  remoteOnly: false,
};

describe("PgJobsStore.searchJobs", () => {
  it("finds an accented title from an unaccented search", async () => {
    // Nobody types "Développeur" with its accent in a search box.
    const found = await store.searchJobs({ ...BASE, query: "developpeur" });

    expect(found.total).toBe(2);
    expect(found.jobs.every((job) => job.title.includes("évelopp"))).toBe(true);
  });

  it("finds an unaccented advert from an accented search", async () => {
    const found = await store.searchJobs({ ...BASE, query: "Développeur" });

    expect(found.total).toBe(2);
  });

  it("narrows with every extra word instead of widening", async () => {
    const one = await store.searchJobs({ ...BASE, query: "developpeur" });
    const two = await store.searchJobs({ ...BASE, query: "developpeur alternance" });

    expect(two.total).toBeLessThan(one.total);
    expect(two.jobs[0]?.title).toContain("Alternance");
  });

  it("searches the company name too", async () => {
    const found = await store.searchJobs({ ...BASE, query: "sodexo" });

    expect(found.jobs[0]?.companyName).toBe("Sodexo");
  });

  it("filters by department, contract and remote", async () => {
    expect(
      (await store.searchJobs({ ...BASE, departments: ["69"] })).total,
    ).toBe(1);
    expect(
      (await store.searchJobs({ ...BASE, contractTypes: ["alternance"] })).total,
    ).toBe(1);
    expect((await store.searchJobs({ ...BASE, remoteOnly: true })).total).toBe(1);
  });

  it("keeps a remote offer when a department is asked for", async () => {
    // Remote work is not somewhere else: it fits every department.
    const found = await store.searchJobs({
      ...BASE,
      departments: ["44"],
      remoteOnly: true,
    });

    expect(found.jobs.map((job) => job.department).sort()).toEqual(["44", "44", "75"]);
  });

  it("hides a closed offer", async () => {
    await store.closeListing("smartrecruiters", "4", new Date().toISOString());

    expect((await store.searchJobs({ ...BASE, query: "sodexo" })).total).toBe(0);
  });

  it("pages through the results", async () => {
    const firstPage = await store.searchJobs({ ...BASE, limit: 2, offset: 0 });
    const secondPage = await store.searchJobs({ ...BASE, limit: 2, offset: 2 });

    expect(firstPage.total).toBe(4);
    expect(firstPage.jobs).toHaveLength(2);
    expect(secondPage.jobs).toHaveLength(2);
    expect(firstPage.jobs[0]?.id).not.toBe(secondPage.jobs[0]?.id);
  });

  it("says how many offers the base holds, criteria aside", async () => {
    // "Your search matched nothing" and "we have nothing" read the same to a
    // candidate; only this number tells them apart.
    const found = await store.searchJobs({ ...BASE, query: "introuvable" });

    expect(found.total).toBe(0);
    expect(found.available).toBe(4);
  });

  it("dates an offer by its publication, not by the day we imported it", async () => {
    // A back-fill over a month sees every advert for the first time today;
    // reading firstSeenAt alone would make them all look published today.
    await deduplicator.attach(
      makeListing({
        externalId: "old",
        publishedAt: new Date(Date.now() - 40 * 86_400_000).toISOString(),
        source: "france_travail",
        title: "Développeur rétroporté",
      }),
    );

    const found = await store.searchJobs({ ...BASE, query: "retroporte" });

    expect(found.total).toBe(0);
  });

  it("ignores an offer older than the window asked for", async () => {
    expect((await store.searchJobs({ ...BASE, maxAgeDays: 0 })).total).toBe(0);
  });
});
