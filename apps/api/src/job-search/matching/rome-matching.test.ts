import { emptySearchProject, type SearchProject } from "@cvforge/types";
import { describe, expect, it } from "vitest";
import type { StoredJob } from "../jobs.types";
import { scoreJob } from "./job-matching";
import {
  contentWords,
  romeSkillsMatch,
  romeTitleScore,
  wordsMatch,
  type RomeScoringContext,
} from "./rome-matching";

const NOW = Date.parse("2026-09-23T06:00:00.000Z");

/**
 * The case the sprint names: the candidate searches "Développeur full stack"
 * and confirmed its ROME job (M1855, web development); the offer is titled
 * "Ingénieur logiciel" (M1805, software studies). No keyword in common, the
 * same domain M18 — and a competence the CV shows.
 */
const SOFTWARE_ENGINEER: StoredJob = {
  closedAt: null,
  companyAnonymous: false,
  companyKey: "acme",
  companyLogoUrl: "",
  companyName: "ACME",
  contractType: "cdi",
  department: "44",
  description: "Au sein de l'équipe R&D, vous concevez nos produits.",
  descriptionSimhash: "",
  firstSeenAt: new Date(NOW).toISOString(),
  id: "job-1",
  lastSeenAt: new Date(NOW).toISOString(),
  latitude: null,
  locationLabel: "Nantes",
  longitude: null,
  primaryUrl: "https://example.com/1",
  publishedAt: new Date(NOW).toISOString(),
  remote: false,
  romeCode: "M1805",
  romeCompetences: [
    { code: "109846", label: "Concevoir une application web", required: false },
    { code: "102789", label: "Programmation en JavaScript", required: false },
    {
      code: "121510",
      label: "Tests unitaires et d'intégration",
      required: true,
    },
  ],
  salaryLabel: "",
  title: "Ingénieur logiciel (H/F)",
  titleKey: "ingenieur logiciel",
};

const FULL_STACK_SEARCH: SearchProject = {
  ...emptySearchProject("p1"),
  locations: [
    {
      department: "44",
      label: "Nantes",
      latitude: null,
      longitude: null,
      radiusKm: 30,
    },
  ] as SearchProject["locations"],
  targetRoles: ["Développeur full stack"],
};

function context(
  overrides: Partial<RomeScoringContext> = {},
): RomeScoringContext {
  return {
    genericCodes: new Set(),
    metierCompetences: new Map(),
    profileCompetences: [
      { code: "109846", label: "Concevoir une application web" },
      { code: "102789", label: "Programmation en JavaScript" },
    ],
    projectCodes: ["M1855"],
    ...overrides,
  };
}

describe("romeTitleScore", () => {
  it("is 1 for a confirmed métier, 0.6 in its domain, 0 elsewhere", () => {
    expect(romeTitleScore({ romeCode: "M1855" }, ["M1855"])).toBe(1);
    expect(romeTitleScore({ romeCode: "M1805" }, ["M1855"])).toBe(0.6);
    // Same grand domaine M, different domain: accounting is not software.
    expect(romeTitleScore({ romeCode: "M1203" }, ["M1855"])).toBe(0);
    expect(romeTitleScore({ romeCode: null }, ["M1855"])).toBe(0);
    expect(romeTitleScore({ romeCode: "M1855" }, [])).toBe(0);
  });
});

describe("romeSkillsMatch", () => {
  it("reads the offer's own competences, required ones first in what is missing", () => {
    expect(romeSkillsMatch(SOFTWARE_ENGINEER, context())).toEqual({
      matched: ["Concevoir une application web", "Programmation en JavaScript"],
      missing: ["Tests unitaires et d'intégration"],
      ratio: 2 / 3,
    });
  });

  it("falls back on the métier's list, discounted, with nothing called missing", () => {
    const metierOnly = { ...SOFTWARE_ENGINEER, romeCompetences: [] };
    const match = romeSkillsMatch(
      metierOnly,
      context({
        metierCompetences: new Map([
          [
            "M1805",
            [
              { code: "109846", label: "Concevoir une application web" },
              { code: "102789", label: "Programmation en JavaScript" },
              { code: "300", label: "Faire preuve de rigueur et de précision" },
              { code: "400", label: "Rédiger un cahier des charges" },
              { code: "500", label: "Administrer une base de données" },
            ],
          ],
        ]),
      }),
    );

    expect(match.matched).toEqual([
      "Concevoir une application web",
      "Programmation en JavaScript",
    ]);
    expect(match.missing).toEqual([]);
    expect(match.ratio).toBeCloseTo((2 / 3) * 0.8);
  });

  it("leaves out generic competences, which every métier has", () => {
    const match = romeSkillsMatch(
      {
        romeCode: "D1102",
        romeCompetences: [
          { code: "300", label: "Faire preuve de rigueur", required: true },
        ],
      },
      context({
        genericCodes: new Set(["300"]),
        profileCompetences: [{ code: "300", label: "Faire preuve de rigueur" }],
      }),
    );

    expect(match).toEqual({ matched: [], missing: [], ratio: 0 });
  });

  it("matches labels ROMEO worded differently from the referential", () => {
    const match = romeSkillsMatch(
      { romeCode: "D1102", romeCompetences: [] },
      context({
        metierCompetences: new Map([
          [
            "D1102",
            [
              {
                code: "A",
                label: "Pétrir manuellement ou mécaniquement des pâtes",
              },
              {
                code: "B",
                label:
                  "Respecter les règles d'hygiène et de sécurité alimentaire",
              },
              { code: "C", label: "Défourner des pains et viennoiseries" },
            ],
          ],
        ]),
        profileCompetences: [
          { code: "X", label: "Pétrir des pâtes à pain et à pâtisserie" },
          { code: "Y", label: "Sécurité alimentaire et HACCP" },
        ],
      }),
    );

    expect(match.matched).toEqual([
      "Pétrir manuellement ou mécaniquement des pâtes",
      "Respecter les règles d'hygiène et de sécurité alimentaire",
    ]);
  });
});

describe("wordsMatch", () => {
  it("needs two meaningful words in common, and half of the shorter label", () => {
    const match = (left: string, right: string) =>
      wordsMatch(contentWords(left), contentWords(right));

    expect(match("Gestion de projet", "Gestion des stocks de matières")).toBe(
      false,
    );
    expect(
      match(
        "Utilisation de logiciels médicaux",
        "Utilisation de logiciels de CAO",
      ),
    ).toBe(false);
    expect(
      match(
        "Techniques de façonnage du pain",
        "Bouler et effectuer la tourne ou le façonnage des pâtons",
      ),
    ).toBe(false);
    // Measured on the referential: "règles" and "sécurité" alone are not a
    // competence in common.
    expect(
      match(
        "Règles d'hygiène et de sécurité alimentaire",
        "Règles de sécurité Informatique et Télécoms",
      ),
    ).toBe(false);
    expect(contentWords("Techniques de pétrissage des pâtes")).toEqual(
      new Set(["petrissage", "pate"]),
    );
  });
});

describe("scoreJob with ROME", () => {
  it("proposes the software engineer offer the keywords alone would miss", () => {
    const keywordsOnly = scoreJob({
      job: SOFTWARE_ENGINEER,
      now: NOW,
      project: FULL_STACK_SEARCH,
      skills: ["TypeScript"],
    });
    const withRome = scoreJob({
      job: SOFTWARE_ENGINEER,
      now: NOW,
      project: FULL_STACK_SEARCH,
      rome: context(),
      skills: ["TypeScript"],
    });

    expect(keywordsOnly.breakdown.title).toBe(0);
    expect(keywordsOnly.breakdown.skills).toBe(0);
    expect(withRome.breakdown.title).toBeCloseTo(30 * 0.6);
    expect(withRome.breakdown.skills).toBeCloseTo(25 * (2 / 3));
    expect(withRome.score).toBeGreaterThanOrEqual(keywordsOnly.score + 34);
    expect(withRome.score).toBeLessThanOrEqual(100);
    expect(withRome.missingSkills).toEqual([
      "Tests unitaires et d'intégration",
    ]);
  });

  it("never lowers a score the keywords already earned", () => {
    const fullStackOffer = {
      ...SOFTWARE_ENGINEER,
      description: "Stack TypeScript et React.",
      romeCode: "E1101",
      romeCompetences: [],
      title: "Développeur Full Stack",
    };
    const input = {
      job: fullStackOffer,
      now: NOW,
      project: FULL_STACK_SEARCH,
      skills: ["TypeScript"],
    };

    expect(scoreJob({ ...input, rome: context() }).score).toBe(
      scoreJob(input).score,
    );
  });

  it("does not repeat a skill the candidate typed and ROME also names", () => {
    const scored = scoreJob({
      job: {
        ...SOFTWARE_ENGINEER,
        description: "Programmation en JavaScript au quotidien.",
      },
      now: NOW,
      project: FULL_STACK_SEARCH,
      rome: context(),
      skills: ["Programmation en javascript"],
    });

    expect(scored.matchedSkills).toEqual([
      "Programmation en javascript",
      "Concevoir une application web",
    ]);
  });
});
