import { emptySearchProject, type SearchProject } from "@cvforge/types";
import { describe, expect, it, vi } from "vitest";
import type { CreditsService } from "../credits/credits.service";
import type { OpenRouterService } from "../ai/openrouter.service";
import type { ProfilesStore, StoredProfile } from "../profiles/profiles.types";
import type { SearchProjectsStore } from "../search-projects/search-projects.types";
import type { BoardsService } from "./boards.service";
import type { JobDeduplicator } from "./dedup/job-deduplicator";
import { dateInParis, hourInParis, JobDigestService } from "./job-digest.service";
import type { JobSourceAdapter, NormalizedJobListing } from "./job-search.types";
import type { JobsStore, StoredJob, StoredJobListing } from "./jobs.types";
import type {
  JobDigestRunsStore,
  JobMatchesStore,
  NewJobMatch,
} from "./matches.types";

/** 08:00 in Paris, so the run is due. */
const NOW = Date.parse("2026-09-23T06:00:00.000Z");

function makeJob(overrides: Partial<StoredJob> = {}): StoredJob {
  return {
    closedAt: null,
    companyAnonymous: false,
    companyKey: "acme",
    companyName: "ACME",
    contractType: "cdi",
    department: "44",
    description: "Stack TypeScript et React, équipe produit.",
    descriptionSimhash: "",
    firstSeenAt: new Date(NOW - 86_400_000).toISOString(),
    id: "job-1",
    lastSeenAt: new Date(NOW).toISOString(),
    latitude: null,
    locationLabel: "Nantes, France",
    longitude: null,
    primaryUrl: "https://example.com/jobs/1",
    publishedAt: new Date(NOW - 86_400_000).toISOString(),
    remote: false,
    salaryLabel: "",
    title: "Développeur Full Stack (H/F)",
    titleKey: "developpeur full stack",
    ...overrides,
  };
}

function makeProject(overrides: Partial<SearchProject> = {}): SearchProject {
  return {
    ...emptySearchProject("profile-1"),
    contractTypes: ["cdi"],
    digestEnabled: true,
    locations: [
      {
        department: "44",
        inseeCode: "44109",
        label: "Nantes",
        latitude: null,
        longitude: null,
        radiusKm: 30,
      },
    ],
    targetRoles: ["Développeur Full Stack"],
    ...overrides,
  };
}

function makeProfile(): StoredProfile {
  return {
    headline: "Développeur Full Stack",
    id: "profile-1",
    identity: {
      city: "Nantes",
      email: "jane@example.com",
      firstName: "Jane",
      github: "",
      lastName: "Doe",
      linkedIn: "",
      otherLink: "",
      phone: "",
      portfolio: "",
    },
    label: "Profil",
    meta: { lastSavedAt: null, maxProfiles: 3, source: "storage" },
    preferences: { availabilityDate: "", availabilityMode: "", contractTypes: "" },
    sections: {
      certifications: [],
      education: [],
      experiences: [],
      interests: "",
      languages: [],
      personalProjects: [],
      softSkills: [],
      summary: "",
      technicalSkills: ["TypeScript", "React"],
    },
  };
}

function makeListing(source: JobSourceAdapter["source"]): NormalizedJobListing {
  return {
    applyUrl: "",
    companyAnonymous: false,
    companyName: "ACME",
    contractType: "cdi",
    department: "44",
    description: "Stack TypeScript et React.",
    externalId: "1",
    latitude: null,
    locationLabel: "Nantes",
    longitude: null,
    partnerUrls: [],
    publishedAt: new Date(NOW).toISOString(),
    raw: {},
    remote: false,
    salaryLabel: "",
    source,
    title: "Développeur Full Stack",
    url: "https://example.com/jobs/1",
  };
}

interface Harness {
  announced: Array<{ emailEnabled: boolean; totalCount: number }>;
  written: NewJobMatch[];
  claims: string[];
  finished: Array<{ status: string }>;
  consumed: string[];
  chat: ReturnType<typeof vi.fn>;
  isStillOpen: ReturnType<typeof vi.fn>;
  service: JobDigestService;
}

function createService(options: {
  projects?: Array<{ userEmail: string; project: SearchProject }>;
  jobs?: StoredJob[];
  listings?: StoredJobListing[];
  alreadyClaimed?: boolean;
  isStillOpen?: boolean | null;
  chatAnswer?: string;
  chatFails?: boolean;
  creditsFail?: boolean;
  notificationFails?: boolean;
  alreadyAnnounced?: boolean;
  now?: number;
} = {}): Harness {
  const now = options.now ?? NOW;
  const written: NewJobMatch[] = [];
  const claims: string[] = [];
  const finished: Array<{ status: string }> = [];
  const consumed: string[] = [];
  const isStillOpen = vi.fn(async () => options.isStillOpen ?? true);
  const chat = vi.fn(async () =>
    options.chatFails
      ? Promise.reject(new Error("modèle indisponible"))
      : (options.chatAnswer ??
          '{"classement":[{"id":"job-1","raison":"Même stack que la vôtre."}]}'),
  );

  const searchProjects: Pick<SearchProjectsStore, "listDigestEnabled"> = {
    listDigestEnabled: async () =>
      options.projects ?? [{ project: makeProject(), userEmail: "user@example.com" }],
  };
  const profiles = {
    deleteByUserEmail: async () => 0,
    findByUserEmail: async () => ({
      activeProfileId: "profile-1",
      profiles: [makeProfile()],
      userEmail: "user@example.com",
      version: 2 as const,
    }),
    save: async (_userEmail: string, registry: never) => registry,
  } as unknown as ProfilesStore;

  const jobs = {
    closeListing: vi.fn(async () => undefined),
    findById: async () => ({
      job: makeJob(),
      listings: options.listings ?? [
        {
          applyUrl: "",
          closedAt: null,
          companyName: "ACME",
          externalId: "1",
          firstSeenAt: new Date(NOW).toISOString(),
          id: "listing-1",
          jobId: "job-1",
          lastSeenAt: new Date(NOW).toISOString(),
          matchMethod: "new" as const,
          publishedAt: new Date(NOW).toISOString(),
          source: "france_travail" as const,
          title: "Développeur Full Stack",
          url: "https://example.com/jobs/1",
        },
      ],
    }),
    findOpenJobs: async () => options.jobs ?? [makeJob()],
  } as unknown as JobsStore;

  const matches = {
    createMany: async (entries: readonly NewJobMatch[]) => {
      written.push(...entries);
      return entries.length;
    },
    listProposedJobIds: async () => [],
  } as unknown as JobMatchesStore;

  const runs: JobDigestRunsStore = {
    claim: async (runDate) => {
      claims.push(runDate);
      return options.alreadyClaimed
        ? null
        : {
            finishedAt: null,
            runDate,
            startedAt: new Date(NOW).toISOString(),
            stats: null,
            status: "running" as const,
          };
    },
    find: async () => null,
    finish: async (_runDate, outcome) => {
      finished.push({ status: outcome.status });
    },
  };

  const boards = {
    collect: async () => ({
      boardsFailed: 0,
      boardsRead: 2,
      boardsRetired: 0,
      listings: [makeListing("greenhouse")],
    }),
  } as unknown as BoardsService;

  const deduplicator = {
    attachAll: async (listings: readonly NormalizedJobListing[]) => ({
      fuzzyMerges: 0,
      jobsCreated: listings.length,
      listingsAttached: listings.length,
    }),
  } as unknown as JobDeduplicator;

  const source: JobSourceAdapter = {
    isStillOpen,
    search: async () => [makeListing("france_travail")],
    source: "france_travail",
  };

  const announced: Array<{ emailEnabled: boolean; totalCount: number }> = [];
  const notifications = {
    sendJobDigestNotification: async (input: {
      emailEnabled: boolean;
      totalCount: number;
    }) => {
      if (options.notificationFails) throw new Error("SMTP en panne");
      announced.push({
        emailEnabled: input.emailEnabled,
        totalCount: input.totalCount,
      });
      return options.alreadyAnnounced ? null : ({ id: "notif-1" } as never);
    },
  } as unknown as import("../notifications/notifications.service").NotificationsService;

  const credits = {
    assertSufficientCredits: async () => {
      if (options.creditsFail) throw new Error("Crédits insuffisants");
    },
    consumeCredits: async (input: { action: string }) => {
      consumed.push(input.action);
      return {} as never;
    },
  } as unknown as CreditsService;

  return {
    announced,
    chat,
    claims,
    consumed,
    finished,
    isStillOpen,
    service: new JobDigestService(
      searchProjects,
      profiles,
      jobs,
      matches,
      runs,
      boards,
      deduplicator,
      [source],
      credits,
      { chat } as unknown as OpenRouterService,
      notifications,
      "https://app.cvforge.test",
      () => now,
    ),
    written,
  };
}

describe("Paris clock", () => {
  it("reads the hour, not the way French writes it", () => {
    // Intl renders "08 h" in French: reading the string as a number gives NaN,
    // and every comparison against it quietly passes.
    expect(hourInParis(Date.parse("2026-09-23T06:00:00.000Z"))).toBe(8);
    expect(hourInParis(Date.parse("2026-09-23T01:00:00.000Z"))).toBe(3);
    // Midnight in Paris is hour 0, not 24.
    expect(hourInParis(Date.parse("2026-09-22T22:00:00.000Z"))).toBe(0);
  });

  it("dates the run by the Paris day", () => {
    // 23:30 UTC is already the next day in Paris.
    expect(dateInParis(Date.parse("2026-09-22T23:30:00.000Z"))).toBe("2026-09-23");
  });
});

describe("JobDigestService", () => {
  it("collects, selects and writes the morning's offers", async () => {
    const harness = createService();

    const stats = await harness.service.run();

    expect(stats).toMatchObject({
      boardsRead: 2,
      listingsCollected: 2,
      matchesWritten: 1,
      projects: 1,
    });
    expect(harness.written[0]).toMatchObject({
      digestDate: "2026-09-23",
      jobId: "job-1",
      userEmail: "user@example.com",
    });
    expect(harness.finished).toEqual([{ status: "done" }]);
  });

  it("does nothing when another instance already owns the day", async () => {
    const harness = createService({ alreadyClaimed: true });

    expect(await harness.service.run()).toBeNull();
    expect(harness.written).toEqual([]);
  });

  it("waits for the morning before running", async () => {
    // 03:00 in Paris: too early. The day is not even claimed, so the run can
    // still happen later the same morning.
    const early = createService({ now: Date.parse("2026-09-23T01:00:00.000Z") });

    expect(await early.service.runIfDue()).toBeNull();
    expect(early.claims).toEqual([]);

    const due = createService();
    expect(await due.service.runIfDue()).not.toBeNull();
  });

  it("drops an offer the source says is gone", async () => {
    const harness = createService({ isStillOpen: false });

    const stats = await harness.service.run();

    expect(stats?.matchesWritten).toBe(0);
    expect(stats?.candidatesWithoutOffers).toBe(1);
  });

  it("keeps an offer when the check itself could not answer", async () => {
    const harness = createService({ isStillOpen: null });

    // "We could not check" is not "it is gone".
    expect((await harness.service.run())?.matchesWritten).toBe(1);
  });

  describe("paid AI pass", () => {
    it("only runs for a candidate who asked for it", async () => {
      const harness = createService();

      await harness.service.run();

      expect(harness.chat).not.toHaveBeenCalled();
      expect(harness.consumed).toEqual([]);
    });

    it("ranks, explains and charges once", async () => {
      const harness = createService({
        projects: [
          {
            project: makeProject({ aiRerankEnabled: true }),
            userEmail: "user@example.com",
          },
        ],
      });

      const stats = await harness.service.run();

      expect(stats?.aiReranks).toBe(1);
      expect(harness.consumed).toEqual(["job_digest_rerank"]);
      expect(harness.written[0]).toMatchObject({
        aiRank: 1,
        aiReason: "Même stack que la vôtre.",
      });
    });

    it("charges nothing when the model fails, and still sends the selection", async () => {
      const harness = createService({
        chatFails: true,
        projects: [
          {
            project: makeProject({ aiRerankEnabled: true }),
            userEmail: "user@example.com",
          },
        ],
      });

      const stats = await harness.service.run();

      expect(harness.consumed).toEqual([]);
      expect(stats?.aiReranks).toBe(0);
      // The deterministic order is a perfectly good fallback.
      expect(stats?.matchesWritten).toBe(1);
      expect(harness.written[0]?.aiRank).toBeNull();
    });

    it("skips the AI pass when the balance is too low", async () => {
      const harness = createService({
        creditsFail: true,
        projects: [
          {
            project: makeProject({ aiRerankEnabled: true }),
            userEmail: "user@example.com",
          },
        ],
      });

      const stats = await harness.service.run();

      expect(harness.chat).not.toHaveBeenCalled();
      expect(stats?.matchesWritten).toBe(1);
    });
  });

  describe("announcement", () => {
    it("announces the selection once written", async () => {
      const harness = createService();

      const stats = await harness.service.run();

      expect(stats?.notificationsSent).toBe(1);
      expect(harness.announced).toEqual([{ emailEnabled: true, totalCount: 1 }]);
    });

    it("passes on the candidate's choice about the e-mail", async () => {
      const harness = createService({
        projects: [
          {
            project: makeProject({ emailEnabled: false }),
            userEmail: "user@example.com",
          },
        ],
      });

      await harness.service.run();

      // In-app only: the offers are still there, the e-mail is not sent.
      expect(harness.announced).toEqual([{ emailEnabled: false, totalCount: 1 }]);
    });

    it("says nothing when nothing new was written", async () => {
      const harness = createService({ isStillOpen: false });

      await harness.service.run();

      expect(harness.announced).toEqual([]);
    });

    it("counts nothing when the morning was already announced", async () => {
      const harness = createService({ alreadyAnnounced: true });

      expect((await harness.service.run())?.notificationsSent).toBe(0);
    });

    it("keeps the offers even when the announcement fails", async () => {
      const harness = createService({ notificationFails: true });

      const stats = await harness.service.run();

      // A bounced e-mail must not cost the candidate their selection.
      expect(stats?.matchesWritten).toBe(1);
      expect(stats?.notificationsSent).toBe(0);
      expect(stats?.errors.some((error) => error.includes("SMTP"))).toBe(true);
      expect(harness.finished).toEqual([{ status: "done" }]);
    });
  });

  it("records a candidate's failure without losing the others", async () => {
    const harness = createService({
      projects: [
        { project: makeProject(), userEmail: "user@example.com" },
        {
          project: makeProject({ profileId: "inconnu" }),
          userEmail: "autre@example.com",
        },
      ],
    });

    const stats = await harness.service.run();

    expect(stats?.projects).toBe(2);
    expect(stats?.matchesWritten).toBeGreaterThanOrEqual(1);
    expect(harness.finished).toEqual([{ status: "done" }]);
  });
});
