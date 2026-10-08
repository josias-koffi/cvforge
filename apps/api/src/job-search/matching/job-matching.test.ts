import { emptySearchProject, type SearchProject } from "@cvforge/types";
import { describe, expect, it } from "vitest";
import type { StoredJob } from "../jobs.types";
import {
  ageInDays,
  hasTradeEvidence,
  masculineForm,
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
    companyLogoUrl: "",
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

  it("measures an offer without coordinates from the commune of its label", () => {
    const project = makeProject({
      locations: [
        {
          department: "59",
          inseeCode: "59350",
          label: "Lille",
          latitude: 50.6311,
          longitude: 3.0468,
          radiusKm: 25,
        },
      ],
    });
    const near = makeJob({ department: "59", locationLabel: "59 - Villeneuve-d'Ascq" });
    // Same department, 60 km away: the department alone used to let it in.
    const far = makeJob({ department: "59", locationLabel: "59 - Maubeuge" });

    expect(rejectionReason({ job: near, now: NOW, project })).toBeNull();
    expect(rejectionReason({ job: far, now: NOW, project })).toBe("location");
  });

  it("reaches a neighbouring department within the radius", () => {
    const project = makeProject({
      locations: [
        {
          department: "75",
          inseeCode: "75056",
          label: "Paris",
          latitude: 48.8589,
          longitude: 2.347,
          radiusKm: 25,
        },
      ],
    });
    const job = makeJob({ department: "92", locationLabel: "92 - Boulogne-Billancourt" });

    expect(rejectionReason({ job, now: NOW, project })).toBeNull();
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

/**
 * The case that started it: a DevOps engineer received "Technicien BTP"
 * offers. Recent and nearby, they took 42 points on context alone, and one
 * stray word — "CI" inside "technicien", "Ingénieur" in a site engineer's
 * title — let them past the relevance check.
 */
describe("a DevOps engineer and the BTP offers", () => {
  const DEVOPS_SKILLS = ["CI", "Go", "Terraform", "Kubernetes", "Ansible"];
  const devops = makeProject({
    experienceLevel: "senior",
    targetRoles: ["Ingénieur DevOps"],
  });
  const recentNearby = {
    firstSeenAt: daysAgo(0),
    latitude: 47.21,
    longitude: -1.55,
    publishedAt: daysAgo(0),
  };
  const btpTechnician = makeJob({
    ...recentNearby,
    description:
      "Technicien BTP confirmé, vous suivez les chantiers de gros œuvre. Permis B, Google Workspace.",
    id: "btp-technician",
    title: "Technicien BTP (H/F)",
  });
  const siteEngineer = makeJob({
    ...recentNearby,
    description: "Pilotage des travaux de voirie et réseaux divers.",
    id: "site-engineer",
    title: "Ingénieur travaux VRD (H/F)",
  });
  const devopsJob = makeJob({
    ...recentNearby,
    description: "Plateforme Kubernetes, infrastructure Terraform, pipelines CI en Go.",
    id: "devops",
    title: "Ingénieur DevOps (H/F)",
  });

  it("reads a skill as a whole word only", () => {
    const scored = scoreJob({ job: btpTechnician, now: NOW, project: devops, skills: DEVOPS_SKILLS });

    // "CI" sits in "technicien", "Go" in "Google": neither is in the advert.
    expect(scored.matchedSkills).toEqual([]);
    expect(scored.breakdown.skills).toBe(0);
  });

  it("does not take a shared generic word for the same job", () => {
    const scored = scoreJob({ job: siteEngineer, now: NOW, project: devops, skills: DEVOPS_SKILLS });

    expect(scored.breakdown.title).toBe(0);
  });

  it("still reads the generic word once the trade matches", () => {
    const scored = scoreJob({ job: devopsJob, now: NOW, project: devops, skills: DEVOPS_SKILLS });

    expect(scored.breakdown.title).toBe(30);
    expect(scored.matchedSkills).toEqual(["CI", "Go", "Terraform", "Kubernetes"]);
  });

  it("gives no title points to a search without target titles", () => {
    const scored = scoreJob({
      job: btpTechnician,
      now: NOW,
      project: makeProject({ targetRoles: [] }),
      skills: DEVOPS_SKILLS,
    });

    expect(scored.breakdown.title).toBe(0);
  });

  it("proposes the DevOps job and none of the BTP offers", () => {
    const selected = selectJobsForProject({
      jobs: [btpTechnician, siteEngineer, devopsJob],
      now: NOW,
      project: devops,
      skills: DEVOPS_SKILLS,
    });

    expect(selected.map((entry) => entry.job.id)).toEqual(["devops"]);
  });

  it("refuses an offer that reaches the threshold on context alone", () => {
    const scored = scoreJob({ job: btpTechnician, now: NOW, project: devops, skills: DEVOPS_SKILLS });

    expect(scored.score).toBeGreaterThanOrEqual(35);
    expect(hasTradeEvidence(scored)).toBe(false);
  });

  it("refuses an offer sharing a single skill and nothing else", () => {
    const oneSkill = makeJob({
      ...recentNearby,
      description: "Suivi de chantier, reporting sous Ansible Tower.",
      id: "one-skill",
      title: "Conducteur de travaux",
    });

    expect(
      selectJobsForProject({ jobs: [oneSkill], now: NOW, project: devops, skills: DEVOPS_SKILLS }),
    ).toEqual([]);
  });
});

/**
 * Measured on production data (jobspark-relevance, 2026-10-08): a software
 * engineer's CV read by ROMEO held "GPAO" and "Piloter la performance d'une
 * activité", which machining and plant offers name too — 20 skill points,
 * past the relevance floor, with not one word of the trade in the title.
 */
describe("hasTradeEvidence", () => {
  const softwareEngineer = makeProject({ targetRoles: ["Ingénieur Fullstack"] });
  const machining = makeJob({
    description: "Usinage CNC, gestion de production assistée par ordinateur, React-ivité exigée.",
    romeCode: "H2503",
    title: "Technicien de production en usinage CNC (H/F)",
  });
  const gpao = {
    genericCodes: new Set<string>(),
    metierCompetences: new Map(),
    profileCompetences: [{ code: "C1", label: "Gestion de Production Assistée Par Ordinateur (GPAO)" }],
    projectCodes: ["M1855"],
  };

  it("does not take ROME competences read in a CV as the trade", () => {
    const scored = scoreJob({
      job: { ...machining, romeCompetences: [{ code: "C1", label: "GPAO", required: true }] },
      now: NOW,
      project: softwareEngineer,
      rome: gpao,
      skills: ["React", "Docker"],
    });

    expect(scored.breakdown.skills).toBeGreaterThan(0);
    expect(hasTradeEvidence(scored)).toBe(false);
  });

  it("takes a word of the trade, the confirmed métier, or two typed skills", () => {
    const base = { now: NOW, project: softwareEngineer, rome: gpao };

    expect(
      hasTradeEvidence(scoreJob({ ...base, job: makeJob({ title: "Ingénieur Fullstack (H/F)" }), skills: [] })),
    ).toBe(true);
    expect(
      hasTradeEvidence(scoreJob({ ...base, job: makeJob({ romeCode: "M1855", title: "Dév web" }), skills: [] })),
    ).toBe(true);
    expect(
      hasTradeEvidence(
        scoreJob({ ...base, job: makeJob({ title: "Software engineer" }), skills: ["TypeScript", "React"] }),
      ),
    ).toBe(true);
    expect(
      hasTradeEvidence(
        scoreJob({ ...base, job: makeJob({ title: "Software engineer" }), skills: ["TypeScript"] }),
      ),
    ).toBe(false);
  });
});

describe("the trade, on the owner's search (production, 2026-10-08)", () => {
  const owner = makeProject({
    targetRoles: ["Ingénieur Fullstack", "Program Analyst / Ingénieur logiciel"],
  });
  const evidenceFor = (title: string, description = "Poste en CDI.", skills: string[] = []) =>
    hasTradeEvidence(
      scoreJob({ job: makeJob({ description, title }), now: NOW, project: owner, skills }),
    );

  it("reads the trade in a title, whatever the spelling of full stack", () => {
    expect(evidenceFor("Développeur Full Stack Senior (H/F)")).toBe(true);
    expect(evidenceFor("Ingénieur logiciel Symfony (H/F)")).toBe(true);
    expect(evidenceFor("Program Analyst (H/F)")).toBe(true);
  });

  it("does not take every analyst for a program analyst", () => {
    expect(evidenceFor("Business Analyst flux de paiements (H/F)")).toBe(false);
    expect(evidenceFor("Data Analyst Confirmé (F/H)")).toBe(false);
  });

  it("does not take a salesman of software for a software engineer", () => {
    expect(evidenceFor("Ingénieur commercial logiciels - CDI (H/F)")).toBe(false);
  });

  it("does not count the skills every trade names", () => {
    const skills = ["Développement", "Architecture", "NestJS"];

    expect(
      evidenceFor(
        "Ingénieur structure",
        "Développement de projets, architecture des ouvrages.",
        skills,
      ),
    ).toBe(false);
    expect(evidenceFor("Chargé d'affaires", "NestJS, développement, architecture.", skills)).toBe(
      false,
    );
  });

  it("reads an English title as its French job", () => {
    expect(evidenceFor("Senior Software Engineer, Connectors Platform")).toBe(true);
    expect(evidenceFor("Full-Stack Engineer (m/f/x)")).toBe(true);
    expect(evidenceFor("Sales Engineer - Software")).toBe(false);
  });
});

describe("the ROME appellations the candidate confirmed", () => {
  const project = makeProject({ targetRoles: ["Ingénieur Fullstack"] });
  const rome = {
    appellations: [
      "Développeur / Développeuse full-stack",
      "Ingénieur / Ingénieure d'étude logiciel informatique",
    ],
    genericCodes: new Set<string>(),
    metierCompetences: new Map(),
    profileCompetences: [],
    projectCodes: [],
  };
  const titleFor = (title: string) =>
    scoreJob({ job: makeJob({ description: "", title }), now: NOW, project, rome, skills: [] })
      .evidence.title;

  it("takes an appellation the candidate did not type as their trade", () => {
    expect(titleFor("Développeuse Full Stack confirmée (H/F)")).toBeGreaterThan(0);
    expect(titleFor("Ingénieur d'études logiciel informatique")).toBe(1);
  });

  it("needs every word of the appellation, not one of them", () => {
    expect(titleFor("Développeur immobilier (H/F)")).toBe(0);
    expect(titleFor("Technicien informatique (H/F)")).toBe(0);
  });
});

describe("masculineForm", () => {
  it.each([
    ["Développeur / Développeuse full-stack", "Développeur full-stack"],
    ["Chef / Cheffe de projet informatique", "Chef de projet informatique"],
    ["Ingénieur / Ingénieure logiciel", "Ingénieur logiciel"],
    ["Data scientist", "Data scientist"],
    ["Web / mobile", "Web / mobile"],
  ])("reads %j as %j", (label, expected) => {
    expect(masculineForm(label)).toBe(expected);
  });
});
