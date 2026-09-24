import { emptySearchProject, type SearchProject } from "@cvforge/types";
import { describe, expect, it } from "vitest";
import type { StoredJob } from "../jobs.types";
import {
  ageInDays,
  readYearlySalary,
  rejectionReason,
  scoreJob,
  selectJobsForProject,
} from "./job-matching";

const NOW = Date.parse("2026-09-23T06:00:00.000Z");
const MS_PER_DAY = 86_400_000;

function daysAgo(days: number): string {
  return new Date(NOW - days * MS_PER_DAY).toISOString();
}

function makeJob(overrides: Partial<StoredJob> = {}): StoredJob {
  return {
    closedAt: null,
    companyAnonymous: false,
    companyKey: "acme",
    companyName: "ACME",
    contractType: "cdi",
    department: "44",
    description:
      "Vous rejoindrez l'équipe produit. Stack TypeScript, React et PostgreSQL.",
    descriptionSimhash: "",
    firstSeenAt: daysAgo(1),
    id: "job-1",
    lastSeenAt: daysAgo(0),
    latitude: null,
    locationLabel: "Nantes, France",
    longitude: null,
    primaryUrl: "https://example.com/jobs/1",
    publishedAt: daysAgo(2),
    remote: false,
    romeCode: null,
    romeCompetences: [],
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

const SKILLS = ["TypeScript", "React", "PostgreSQL", "Docker", "Kubernetes"];

describe("rejectionReason", () => {
  it("accepts an offer that fits", () => {
    expect(
      rejectionReason({ job: makeJob(), now: NOW, project: makeProject() }),
    ).toBeNull();
  });

  it("refuses a contract the candidate did not ask for", () => {
    const project = makeProject({ contractTypes: ["stage", "alternance"] });

    expect(rejectionReason({ job: makeJob(), now: NOW, project })).toBe("contract");
  });

  it("only proposes an unreadable contract to someone open to a CDI", () => {
    const job = makeJob({ contractType: "unknown" });

    expect(
      rejectionReason({ job, now: NOW, project: makeProject({ contractTypes: ["cdi"] }) }),
    ).toBeNull();
    // An internship seeker must never receive an offer we could not read.
    expect(
      rejectionReason({
        job,
        now: NOW,
        project: makeProject({ contractTypes: ["stage"] }),
      }),
    ).toBe("contract");
  });

  it("refuses an offer past the 30-day rule", () => {
    expect(
      rejectionReason({
        job: makeJob({ firstSeenAt: daysAgo(40), publishedAt: daysAgo(45) }),
        now: NOW,
        project: makeProject(),
      }),
    ).toBe("too_old");
  });

  it("reads the age from the oldest date, not the kindest one", () => {
    // Collected 40 days ago, "published" yesterday: a repost must not pass.
    const job = makeJob({ firstSeenAt: daysAgo(40), publishedAt: daysAgo(1) });

    expect(ageInDays(job, NOW)).toBeGreaterThan(39);
    expect(rejectionReason({ job, now: NOW, project: makeProject() })).toBe("too_old");
  });

  it("refuses a closed offer and one already proposed", () => {
    expect(
      rejectionReason({
        job: makeJob({ closedAt: daysAgo(0) }),
        now: NOW,
        project: makeProject(),
      }),
    ).toBe("closed");
    expect(
      rejectionReason({
        alreadyProposedJobIds: new Set(["job-1"]),
        job: makeJob(),
        now: NOW,
        project: makeProject(),
      }),
    ).toBe("already_proposed");
  });

  it("refuses an excluded company, however it is spelled", () => {
    const project = makeProject({ excludedCompanies: ["acme"] });

    expect(
      rejectionReason({ job: makeJob({ companyName: "ACME SAS" }), now: NOW, project }),
    ).toBe("excluded_company");
  });

  it("refuses a job outside every place the candidate accepted", () => {
    const job = makeJob({ department: "75", locationLabel: "Paris" });

    expect(rejectionReason({ job, now: NOW, project: makeProject() })).toBe("location");
  });

  it("accepts anywhere for a candidate mobile nationwide", () => {
    const job = makeJob({ department: "75" });

    expect(
      rejectionReason({ job, now: NOW, project: makeProject({ nationalMobility: true }) }),
    ).toBeNull();
  });

  it("accepts a remote job wherever it sits", () => {
    const job = makeJob({ department: "75", remote: true });

    expect(rejectionReason({ job, now: NOW, project: makeProject() })).toBeNull();
  });

  it("refuses an on-site job to someone who wants full remote", () => {
    const project = makeProject({ remote: "full_remote" });

    expect(rejectionReason({ job: makeJob(), now: NOW, project })).toBe("location");
  });
});

describe("scoreJob", () => {
  it("scores a good match high and names the skills it found", () => {
    const scored = scoreJob({
      job: makeJob(),
      now: NOW,
      project: makeProject(),
      skills: SKILLS,
    });

    expect(scored.score).toBeGreaterThan(70);
    expect(scored.matchedSkills).toEqual(["TypeScript", "React", "PostgreSQL"]);
  });

  it("scores a loosely related offer lower than a close one", () => {
    const close = scoreJob({
      job: makeJob(),
      now: NOW,
      project: makeProject(),
      skills: SKILLS,
    });
    const loose = scoreJob({
      job: makeJob({
        description: "Gestion de la caisse et accueil des clients.",
        title: "Chef de rayon",
      }),
      now: NOW,
      project: makeProject(),
      skills: SKILLS,
    });

    expect(loose.score).toBeLessThan(close.score);
  });

  it("prefers a fresh offer over an old one, all else equal", () => {
    const fresh = scoreJob({
      job: makeJob({ firstSeenAt: daysAgo(0), publishedAt: daysAgo(0) }),
      now: NOW,
      project: makeProject(),
      skills: SKILLS,
    });
    const old = scoreJob({
      job: makeJob({ firstSeenAt: daysAgo(25), publishedAt: daysAgo(25) }),
      now: NOW,
      project: makeProject(),
      skills: SKILLS,
    });

    expect(fresh.score).toBeGreaterThan(old.score);
  });

  it("penalises a senior offer for a candidate starting out", () => {
    const project = makeProject({ experienceLevel: "debutant" });
    const senior = scoreJob({
      job: makeJob({ title: "Lead Developer Senior (H/F)" }),
      now: NOW,
      project,
      skills: SKILLS,
    });
    const junior = scoreJob({
      job: makeJob({ title: "Développeur Full Stack Junior (H/F)" }),
      now: NOW,
      project,
      skills: SKILLS,
    });

    expect(junior.score).toBeGreaterThan(senior.score);
  });

  it("stays neutral on a salary the offer never states", () => {
    const project = makeProject({ salaryMinYearly: 45_000 });
    const silent = scoreJob({ job: makeJob(), now: NOW, project, skills: SKILLS });
    const generous = scoreJob({
      job: makeJob({ salaryLabel: "Annuel de 50000,00 Euros sur 12 mois" }),
      now: NOW,
      project,
      skills: SKILLS,
    });
    const low = scoreJob({
      job: makeJob({ salaryLabel: "Annuel de 30000,00 Euros sur 12 mois" }),
      now: NOW,
      project,
      skills: SKILLS,
    });

    expect(generous.score).toBeGreaterThan(silent.score);
    expect(silent.score).toBeGreaterThan(low.score);
  });

  it("never exceeds 100", () => {
    const scored = scoreJob({
      job: makeJob({
        firstSeenAt: daysAgo(0),
        latitude: 47.21,
        longitude: -1.55,
        publishedAt: daysAgo(0),
        remote: true,
        salaryLabel: "Annuel de 60000,00 Euros sur 12 mois",
      }),
      now: NOW,
      project: makeProject({ experienceLevel: "senior", salaryMinYearly: 45_000 }),
      skills: SKILLS,
    });

    expect(scored.score).toBeLessThanOrEqual(100);
  });
});

describe("readYearlySalary", () => {
  it.each([
    // "sur 12 mois" ends an annual label; reading it as monthly would turn
    // 55 000 € into 660 000 €.
    ["Annuel de 45000,00 Euros à 55000,00 Euros sur 12 mois", 55_000],
    ["Mensuel de 3 000,00 Euros sur 12 mois", 36_000],
    ["Horaire de 25,00 Euros", 45_500],
    ["45 000 € / an", 45_000],
    ["3 200 € par mois", 38_400],
    // No period stated: a four-figure salary is monthly in France.
    ["Rémunération : 3500 euros", 42_000],
    ["Rémunération : 42000 euros", 42_000],
  ])("reads %j as %i", (label, expected) => {
    expect(readYearlySalary(label)).toBe(expected);
  });

  it("gives up rather than inventing a figure", () => {
    expect(readYearlySalary("Selon profil")).toBeNull();
    expect(readYearlySalary("")).toBeNull();
  });
});

describe("selectJobsForProject", () => {
  it("keeps the best offers, in order, and drops the rest", () => {
    const jobs = [
      makeJob({ id: "good" }),
      makeJob({
        description: "Accueil des clients, tenue de caisse.",
        id: "unrelated",
        title: "Hôte de caisse",
      }),
      makeJob({ contractType: "stage", id: "wrong-contract" }),
      makeJob({ closedAt: daysAgo(0), id: "closed" }),
    ];

    const selected = selectJobsForProject({
      jobs,
      now: NOW,
      project: makeProject(),
      skills: SKILLS,
    });

    expect(selected.map((entry) => entry.job.id)).toEqual(["good"]);
  });

  it("honours the size of the selection", () => {
    const jobs = Array.from({ length: 25 }, (_, index) =>
      makeJob({ id: `job-${index}` }),
    );

    expect(
      selectJobsForProject({
        jobs,
        limit: 5,
        now: NOW,
        project: makeProject(),
        skills: SKILLS,
      }),
    ).toHaveLength(5);
  });

  it("proposes nothing rather than something poor", () => {
    const jobs = [
      makeJob({
        description: "Plonge et nettoyage de la cuisine.",
        id: "poor",
        title: "Plongeur",
      }),
    ];

    expect(
      selectJobsForProject({ jobs, now: NOW, project: makeProject(), skills: SKILLS }),
    ).toEqual([]);
  });
});
