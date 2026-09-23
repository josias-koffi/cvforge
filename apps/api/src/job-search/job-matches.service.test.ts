import { describe, expect, it, vi } from "vitest";
import type { ApplicationsService } from "../applications/applications.service";
import { JobMatchesService } from "./job-matches.service";
import type { JobSourceAdapter } from "./job-search.types";
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
} = {}) {
  const statuses: Array<{ status: string; applicationId?: string }> = [];
  const closed: string[] = [];
  const importFromText = vi.fn(async () => ({ id: "app-1" }) as never);
  const importFromUrl = vi.fn(async () => ({ id: "app-2" }) as never);
  const updateOffer = vi.fn(async () => ({}) as never);

  const matches = {
    findById: async () =>
      options.match === undefined ? makeMatch() : options.match,
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
    findById: async () => ({
      job: makeJob(),
      listings: options.listings ?? [makeListing()],
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
    importFromText,
    importFromUrl,
    service: new JobMatchesService(
      matches,
      jobs,
      applications,
      [source],
      () => NOW,
    ),
    statuses,
    updateOffer,
  };
}

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

      const result = await harness.service.applyToMatch("user@example.com", "match-1");

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

      const result = await harness.service.applyToMatch("user@example.com", "match-1");

      expect(result).toEqual({ applicationId: "app-2", outcome: "applied" });
      expect(harness.importFromUrl).toHaveBeenCalled();
    });

    it("refuses, and charges nothing, when the offer is gone", async () => {
      const harness = createService({ isStillOpen: false });

      const result = await harness.service.applyToMatch("user@example.com", "match-1");

      expect(result).toEqual({ outcome: "closed" });
      expect(harness.importFromText).not.toHaveBeenCalled();
      expect(harness.importFromUrl).not.toHaveBeenCalled();
      // The advert is marked closed, so tomorrow's selection skips it.
      expect(harness.closed).toEqual(["1"]);
    });

    it("goes ahead when the check could not answer", async () => {
      const harness = createService({ isStillOpen: null });

      // "We could not check" must not block a candidate from applying.
      expect(
        (await harness.service.applyToMatch("user@example.com", "match-1")).outcome,
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
        (await harness.service.applyToMatch("user@example.com", "match-1")).outcome,
      ).toBe("applied");
    });

    it("refuses an offer that belongs to somebody else", async () => {
      const harness = createService({ match: null });

      expect(
        await harness.service.applyToMatch("intruder@example.com", "match-1"),
      ).toEqual({ outcome: "not_found" });
    });
  });
});
