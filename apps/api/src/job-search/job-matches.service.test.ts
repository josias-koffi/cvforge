import { describe, expect, it, vi } from "vitest";
import type { ApplicationsService } from "../applications/applications.service";
import { JobMatchesService } from "./job-matches.service";
import type { JobSource, JobSourceAdapter } from "./job-search.types";
import type { JobsStore, StoredJob, StoredJobListing } from "./jobs.types";
import type { JobMatchWithJob, JobMatchesStore } from "./matches.types";

const NOW = Date.parse("2026-09-23T06:00:00.000Z");

const ADVERT = `Nous recherchons un développeur full stack pour rejoindre notre équipe produit.
Vous travaillerez sur notre application React et notre API Node.js en TypeScript, avec des revues
de code régulières et une vraie culture du test. Profil : 3 ans d'expérience minimum.`;

function makeJob(overrides: Partial<StoredJob> = {}): StoredJob {
  return {
    closedAt: null,
    companyAnonymous: false,
    companyKey: "acme",
    companyName: "ACME",
    contractType: "cdi",
    department: "44",
    description: ADVERT,
    descriptionSimhash: "",
    firstSeenAt: new Date(NOW).toISOString(),
    id: "job-1",
    lastSeenAt: new Date(NOW).toISOString(),
    latitude: null,
    locationLabel: "Nantes",
    longitude: null,
    primaryUrl: "https://job-boards.greenhouse.io/acme/jobs/1",
    publishedAt: new Date(NOW).toISOString(),
    remote: false,
    salaryLabel: "",
    title: "Développeur Full Stack",
    titleKey: "developpeur full stack",
    ...overrides,
  };
}

function makeListing(overrides: Partial<StoredJobListing> = {}): StoredJobListing {
  return {
    applyUrl: "",
    closedAt: null,
    companyName: "ACME",
    externalId: "1",
    firstSeenAt: new Date(NOW).toISOString(),
    id: "listing-1",
    jobId: "job-1",
    lastSeenAt: new Date(NOW).toISOString(),
    matchMethod: "new",
    publishedAt: new Date(NOW).toISOString(),
    source: "france_travail",
    title: "Développeur Full Stack",
    url: "https://candidat.francetravail.fr/offres/recherche/detail/1",
    ...overrides,
  };
}

function makeMatch(job = makeJob()): JobMatchWithJob {
  return {
    aiRank: null,
    aiReason: null,
    applicationId: null,
    createdAt: new Date(NOW).toISOString(),
    digestDate: "2026-09-23",
    id: "match-1",
    job,
    jobId: job.id,
    matchedSkills: ["TypeScript"],
    profileId: "profile-1",
    score: 78,
    scoreBreakdown: null,
    status: "new",
    userEmail: "user@example.com",
  };
}

function createService(options: {
  match?: JobMatchWithJob | null;
  listings?: StoredJobListing[];
  isStillOpen?: boolean | null;
  searchResults?: StoredJob[];
  knownStatuses?: Map<string, JobMatchWithJob>;
  missingJob?: boolean;
  /** Sources an admin switched off: never called, not even to check an offer. */
  disabledSources?: JobSource[];
} = {}) {
  const created: unknown[] = [];
  const statuses: Array<{ status: string; applicationId?: string }> = [];
  const closed: string[] = [];
  const importFromText = vi.fn(async () => ({ id: "app-1" }) as never);
  const importFromUrl = vi.fn(async () => ({ id: "app-2" }) as never);
  const updateOffer = vi.fn(async () => ({}) as never);

  const matches = {
    createMany: async (entries: readonly unknown[]) => {
      created.push(...entries);
      return entries.length;
    },
    findByJobId: async () =>
      options.match === undefined ? makeMatch() : options.match,
    findById: async () =>
      options.match === undefined ? makeMatch() : options.match,
    listStatusesByJobIds: async () => options.knownStatuses ?? new Map(),
    listByDigestDate: async () => (options.match ? [options.match] : [makeMatch()]),
    listRecent: async () => [makeMatch()],
    setStatus: async (
      _userEmail: string,
      _matchId: string,
      status: string,
      applicationId?: string,
    ) => {
      statuses.push({ applicationId, status });
      return null;
    },
  } as unknown as JobMatchesStore;

  const jobs = {
    closeListing: async (_source: string, externalId: string) => {
      closed.push(externalId);
    },
    findById: async () =>
      options.missingJob
        ? null
        : {
            job: makeJob(),
            listings: options.listings ?? [makeListing()],
          },
    searchJobs: async () => ({
      jobs: options.searchResults ?? [makeJob()],
      total: (options.searchResults ?? [makeJob()]).length,
    }),
  } as unknown as JobsStore;

  const applications = {
    importFromText,
    importFromUrl,
    updateOffer,
  } as unknown as ApplicationsService;

  const source: JobSourceAdapter = {
    isStillOpen: vi.fn(async () => options.isStillOpen ?? true),
    search: async () => [],
    source: "france_travail",
  };

  return {
    closed,
    created,
    importFromText,
    importFromUrl,
    service: new JobMatchesService(
      matches,
      jobs,
      applications,
      [source],
      {
        list: async () => [],
        listDisabled: async () => new Set(options.disabledSources ?? []),
        recordRun: async () => {},
        setEnabled: async () => null,
      },
      () => NOW,
    ),
    statuses,
    updateOffer,
  };
}

describe("JobMatchesService.searchOffers", () => {
  it("returns the offers we hold, with what the candidate already did", async () => {
    const harness = createService({
      knownStatuses: new Map([["job-1", { ...makeMatch(), status: "saved" }]]),
    });

    const found = await harness.service.searchOffers("user@example.com", {
      contractTypes: [],
      departments: ["44"],
      limit: 20,
      maxAgeDays: 30,
      offset: 0,
      query: "développeur",
      remoteOnly: false,
    });

    expect(found.total).toBe(1);
    expect(found.offers[0]).toMatchObject({ score: 78, status: "saved" });
    expect(found.offers[0]?.listings).toHaveLength(1);
  });

  it("shows no score for an offer nothing ranked", async () => {
    const harness = createService({ knownStatuses: new Map() });

    const found = await harness.service.searchOffers("user@example.com", {
      contractTypes: [],
      departments: [],
      limit: 20,
      maxAgeDays: 30,
      offset: 0,
      query: "",
      remoteOnly: false,
    });

    // Inventing a number would claim a ranking that never happened.
    expect(found.offers[0]).toMatchObject({ score: null, status: null });
  });
});

describe("JobMatchesService.setStatusForJob", () => {
  it("records what the candidate did with an offer they found themselves", async () => {
    const harness = createService({ match: null });

    await harness.service.setStatusForJob("user@example.com", "job-1", "saved");

    // A hand-picked offer gets its row on first use, with no score.
    expect(harness.created).toHaveLength(1);
    expect(harness.created[0]).toMatchObject({ jobId: "job-1", score: 0 });
  });

  it("refuses an offer we do not hold", async () => {
    const harness = createService({ match: null, missingJob: true });

    expect(
      await harness.service.setStatusForJob("user@example.com", "inconnue", "saved"),
    ).toBeNull();
  });
});

describe("JobMatchesService", () => {
  it("serves a day's selection with every source that publishes each offer", async () => {
    const harness = createService({
      listings: [
        makeListing(),
        makeListing({ id: "listing-2", source: "greenhouse" }),
      ],
    });

    const digest = await harness.service.getDigest("user@example.com", "2026-09-23");

    expect(digest.digestDate).toBe("2026-09-23");
    expect(digest.matches[0]?.listings.map((listing) => listing.source)).toEqual([
      "france_travail",
      "greenhouse",
    ]);
  });

  it("defaults to today, Paris time", async () => {
    const harness = createService();

    expect((await harness.service.getDigest("user@example.com", null)).digestDate).toBe(
      "2026-09-23",
    );
  });

  describe("applying", () => {
    it("creates the application from the advert text we already hold", async () => {
      const harness = createService();

      const result = await harness.service.applyToJob("user@example.com", "job-1");

      expect(result).toEqual({ applicationId: "app-1", outcome: "applied" });
      expect(harness.importFromText).toHaveBeenCalledWith(
        "user@example.com",
        expect.stringContaining("développeur full stack"),
      );
      // Re-fetching the page would only add a way to fail.
      expect(harness.importFromUrl).not.toHaveBeenCalled();
      expect(harness.updateOffer).toHaveBeenCalled();
      expect(harness.statuses).toEqual([
        { applicationId: "app-1", status: "applied" },
      ]);
    });

    it("falls back on the URL when the advert text is too thin", async () => {
      const harness = createService({
        match: makeMatch(makeJob({ description: "Voir l'annonce." })),
      });

      const result = await harness.service.applyToJob("user@example.com", "job-1");

      expect(result).toEqual({ applicationId: "app-2", outcome: "applied" });
      expect(harness.importFromUrl).toHaveBeenCalled();
    });

    it("refuses, and charges nothing, when the offer is gone", async () => {
      const harness = createService({ isStillOpen: false });

      const result = await harness.service.applyToJob("user@example.com", "job-1");

      expect(result).toEqual({ outcome: "closed" });
      expect(harness.importFromText).not.toHaveBeenCalled();
      expect(harness.importFromUrl).not.toHaveBeenCalled();
      // The advert is marked closed, so tomorrow's selection skips it.
      expect(harness.closed).toEqual(["1"]);
    });

    it("never calls a source an admin switched off, even to check", async () => {
      // Switching a source off has to stop every call to it, not only the
      // collection — otherwise the candidate pays for a check nobody wanted.
      const harness = createService({
        disabledSources: ["france_travail"],
        isStillOpen: false,
      });

      // Unasked, so the offer is not declared closed, and the candidate applies.
      expect(
        (await harness.service.applyToJob("user@example.com", "job-1")).outcome,
      ).toBe("applied");
      expect(harness.closed).toEqual([]);
    });

    it("goes ahead when the check could not answer", async () => {
      const harness = createService({ isStillOpen: null });

      // "We could not check" must not block a candidate from applying.
      expect(
        (await harness.service.applyToJob("user@example.com", "job-1")).outcome,
      ).toBe("applied");
    });

    it("goes ahead while one source of two still lists the offer", async () => {
      const harness = createService({
        listings: [
          makeListing(),
          makeListing({ id: "listing-2", source: "greenhouse" }),
        ],
        isStillOpen: false,
      });

      // Greenhouse has no live check here, so it still counts as open.
      expect(
        (await harness.service.applyToJob("user@example.com", "job-1")).outcome,
      ).toBe("applied");
    });

    it("refuses an offer that belongs to somebody else", async () => {
      const harness = createService({ match: null });

      expect(
        await harness.service.applyToJob("intruder@example.com", "job-1"),
      ).toEqual({ outcome: "not_found" });
    });
  });
});
