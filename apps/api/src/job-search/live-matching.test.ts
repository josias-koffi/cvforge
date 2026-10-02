import {
  DEFAULT_JOB_ALERT_PREFERENCES,
  emptySearchProject,
  type JobAlertPreferences,
  type SearchProject,
} from "@cvforge/types";
import { describe, expect, it, vi } from "vitest";
import type { NewAlertMatch } from "./alert-matches.pg-store";
import type { JobSourceAdapter, NormalizedJobListing } from "./job-search.types";
import type { StoredJob } from "./jobs.types";
import { ALERT_SCORE_THRESHOLD, LiveMatcher, previewJob } from "./live-matching";
import type { RomeScoringContext } from "./matching/rome-matching";

const NOW = Date.parse("2026-10-02T09:00:00Z");
const SKILLS = ["TypeScript", "React", "PostgreSQL", "Docker", "Kubernetes"];

function project(overrides: Partial<SearchProject> = {}): SearchProject {
  return {
    ...emptySearchProject("profile-1"),
    contractTypes: ["cdi"],
    locations: [
      {
        department: "44",
        inseeCode: "44109",
        label: "Nantes",
        latitude: 47.21,
        longitude: -1.55,
        radiusKm: 30,
      },
    ],
    targetRoles: ["Développeur Full Stack"],
    ...overrides,
  };
}

function listing(
  externalId: string,
  title: string,
  description: string,
  overrides: Partial<NormalizedJobListing> = {},
): NormalizedJobListing {
  return {
    applyUrl: "",
    companyAnonymous: false,
    companyName: "ACME",
    contractType: "cdi",
    department: "44",
    description,
    externalId,
    latitude: 47.2,
    locationLabel: "Nantes",
    longitude: -1.5,
    partnerUrls: [],
    publishedAt: new Date(NOW - 4 * 60_000).toISOString(),
    raw: {},
    remote: false,
    salaryLabel: "",
    source: "france_travail",
    title,
    url: `https://candidat.francetravail.fr/offres/${externalId}`,
    ...overrides,
  };
}

/** 92 for the search below: a full-stack developer job in Nantes. */
const PERFECT = listing("FT1", "Développeur Full Stack", SKILLS.join(" "));
/** 47: a developer, but none of the skills — kept, no alert. */
const CLOSE = listing("FT2", "Développeur", "Java");
/** 37 on place and freshness alone: not a developer job, forgotten. */
const UNRELATED = listing("FT3", "Comptable", "Bilans et liasses fiscales");
/** Paris, for a search in Nantes: rejected before scoring. */
const ELSEWHERE = listing("FT4", "Développeur Full Stack", SKILLS.join(" "), {
  department: "75",
  latitude: 48.86,
  locationLabel: "Paris",
  longitude: 2.35,
});

function createMatcher(input: {
  searches?: Array<{ userEmail: string; project: SearchProject; romeCodes: string[] }>;
  stillOpen?: boolean | null;
  profileFails?: string;
  preferences?: Record<string, Partial<JobAlertPreferences>>;
} = {}) {
  const stored = new Map<string, StoredJob>();
  const alerts: NewAlertMatch[] = [];
  const deps = {
    alertPreferences: vi.fn(async (email: string) => ({
      ...DEFAULT_JOB_ALERT_PREFERENCES,
      ...input.preferences?.[email],
    })),
    alerts: {
      createAlert: vi.fn(async (match: NewAlertMatch) => {
        alerts.push(match);
        return `alert-${alerts.length}`;
      }),
      markAlertSent: vi.fn(),
    },
    deduplicator: {
      attach: vi.fn(async (offer: NormalizedJobListing) => {
        const job = { ...previewJob(offer, new Date(NOW).toISOString()), id: `job-${offer.externalId}` };
        stored.set(job.id, job);
        return { created: true, jobId: job.id } as never;
      }),
    },
    jobs: {
      closeListing: vi.fn(async () => {}),
      findById: vi.fn(async (id: string) =>
        stored.has(id) ? { job: stored.get(id)!, listings: [] } : null,
      ),
    },
    now: () => NOW,
    profiles: {
      findByUserEmail: vi.fn(async (email: string) => {
        if (email === input.profileFails) throw new Error("profil illisible");
        return {
          profiles: [{ id: "profile-1", sections: { technicalSkills: SKILLS } }],
        } as never;
      }),
    },
    rome: {
      forRun: () => ({
        contextFor: async () =>
          ({
            genericCodes: new Set(),
            metierCompetences: new Map(),
            profileCompetences: [],
            projectCodes: [],
          }) as unknown as RomeScoringContext,
      }),
    },
    searchProjects: {
      listAll: vi.fn(async () =>
        input.searches ?? [{ project: project(), romeCodes: [], userEmail: "ada@example.com" }],
      ),
    },
    sources: [
      {
        isStillOpen: vi.fn(async () => (input.stillOpen === undefined ? true : input.stillOpen)),
        search: vi.fn(),
        source: "france_travail",
      } satisfies JobSourceAdapter,
    ],
  };

  return { alerts, deps, matcher: new LiveMatcher(deps) };
}

describe("LiveMatcher", () => {
  it("keeps only the offers a search wants, and forgets the rest", async () => {
    const { deps, matcher } = createMatcher();

    const stats = await matcher.handle([PERFECT, CLOSE, UNRELATED, ELSEWHERE]);

    expect(deps.deduplicator.attach.mock.calls.map(([offer]) => offer.externalId)).toEqual([
      "FT1",
      "FT2",
    ]);
    expect(stats).toMatchObject({ listings: 4, searches: 1, stored: 2 });
  });

  it("raises an alert above the threshold, with the publication and detection dates", async () => {
    const { alerts, matcher } = createMatcher();

    await matcher.handle([PERFECT, CLOSE]);

    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      detectedAt: new Date(NOW).toISOString(),
      digestDate: "2026-10-02",
      jobId: "job-FT1",
      profileId: "profile-1",
      publishedAt: PERFECT.publishedAt,
      source: "france_travail",
      userEmail: "ada@example.com",
    });
    expect(alerts[0]!.score).toBeGreaterThanOrEqual(ALERT_SCORE_THRESHOLD);
    expect(alerts[0]!.matchedSkills).toEqual(expect.arrayContaining(["TypeScript"]));
  });

  it("checks the offer live first, and closes it rather than alert on a dead one", async () => {
    const { alerts, deps, matcher } = createMatcher({ stillOpen: false });

    const stats = await matcher.handle([PERFECT]);

    expect(deps.sources[0]!.isStillOpen).toHaveBeenCalledWith("FT1");
    expect(deps.jobs.closeListing).toHaveBeenCalledWith(
      "france_travail",
      "FT1",
      new Date(NOW).toISOString(),
    );
    expect(alerts).toEqual([]);
    expect(stats.closedBeforeAlert).toBe(1);
  });

  it("still alerts when the source could not tell", async () => {
    const { alerts, matcher } = createMatcher({ stillOpen: null });

    await matcher.handle([PERFECT]);

    expect(alerts).toHaveLength(1);
  });

  it("stores an offer once even when several searches want it, one alert each", async () => {
    const { alerts, deps, matcher } = createMatcher({
      searches: [
        { project: project(), romeCodes: [], userEmail: "ada@example.com" },
        { project: project(), romeCodes: [], userEmail: "grace@example.com" },
      ],
    });

    await matcher.handle([PERFECT]);

    expect(deps.deduplicator.attach).toHaveBeenCalledTimes(1);
    expect(deps.sources[0]!.isStillOpen).toHaveBeenCalledTimes(1);
    expect(alerts.map((alert) => alert.userEmail)).toEqual([
      "ada@example.com",
      "grace@example.com",
    ]);
  });

  it("loses one search on an error, never the others", async () => {
    const { alerts, matcher } = createMatcher({
      profileFails: "ada@example.com",
      searches: [
        { project: project(), romeCodes: [], userEmail: "ada@example.com" },
        { project: project(), romeCodes: [], userEmail: "grace@example.com" },
      ],
    });

    const stats = await matcher.handle([PERFECT]);

    expect(alerts.map((alert) => alert.userEmail)).toEqual(["grace@example.com"]);
    expect(stats.errors).toHaveLength(1);
  });

  it("follows each candidate's alert preferences (US-166)", async () => {
    const { alerts, deps, matcher } = createMatcher({
      preferences: {
        "ada@example.com": { enabled: false },
        "grace@example.com": { threshold: "all" },
      },
      searches: [
        { project: project(), romeCodes: [], userEmail: "ada@example.com" },
        { project: project(), romeCodes: [], userEmail: "grace@example.com" },
        { project: project(), romeCodes: [], userEmail: "linus@example.com" },
      ],
    });

    await matcher.handle([PERFECT, CLOSE]);

    // Ada turned alerts off: her offers wait for the morning, still stored.
    expect(deps.deduplicator.attach).toHaveBeenCalledTimes(2);
    expect(alerts.map((alert) => `${alert.userEmail} ${alert.jobId}`).sort()).toEqual([
      // Grace wants every match, the close one included.
      "grace@example.com job-FT1",
      "grace@example.com job-FT2",
      // Linus keeps the default: very close offers only.
      "linus@example.com job-FT1",
    ]);
  });

  it("does nothing at all without searches", async () => {
    const { deps, matcher } = createMatcher({ searches: [] });

    expect(await matcher.handle([PERFECT])).toMatchObject({ stored: 0 });
    expect(deps.deduplicator.attach).not.toHaveBeenCalled();
  });
});
