import type { CVDocumentContent } from "@cvforge/types";
import { describe, expect, it } from "vitest";
import { scoreAts } from "../engine";
import { fromCvDocument } from "./from-cv-document";
import { parseCvText } from "./from-text";

/**
 * The same career, expressed the two ways the product can hold it.
 *
 * `MAX_DIVERGENCE` is the contract between the two surfaces: a candidate who
 * scans a CV on the landing and then generates its equivalent in the app must
 * not be told two different things about the same career. Inference on flat
 * text will never match a structured document exactly — three points is the
 * tolerance we accept for that, and a regression past it is a bug.
 */
const MAX_DIVERGENCE = 3;

const STRUCTURED: CVDocumentContent = {
  candidate: {
    city: "Lyon",
    email: "candidat@example.com",
    firstName: "Alex",
    github: "github.com/alex",
    lastName: "Martin",
    linkedin: "linkedin.com/in/alex",
    phone: "+33 6 12 34 56 78",
    summary:
      "Ingénieur plateforme, huit ans d'expérience sur des chaînes de livraison TypeScript et PostgreSQL.",
    title: "Ingénieur plateforme",
  },
  certifications: [
    { issuer: "CNCF", title: "Certified Kubernetes Administrator", year: "2023" },
  ],
  education: [
    {
      degree: "Master informatique",
      description: "Spécialité systèmes répartis.",
      institution: "Université de Lyon",
      mention: "Bien",
      year: "2016",
    },
  ],
  experiences: [
    {
      achievements: [
        "Réduit le temps de build TypeScript de 40% en parallélisant la chaîne CI.",
        "Optimisé 12 requêtes PostgreSQL critiques, divisant par 3 la latence du rapport.",
      ],
      company: "Acme",
      description: "",
      endDate: "present",
      position: "Ingénieur plateforme",
      startDate: "01/2022",
    },
    {
      achievements: [
        "Standardisé 8 images Docker, réduisant de 60% la taille des conteneurs livrés.",
        "Encadré 3 développeurs sur la migration TypeScript de 40 services internes.",
      ],
      company: "Globex",
      description: "",
      endDate: "12/2021",
      position: "Développeur backend",
      startDate: "03/2019",
    },
  ],
  interests: "Course à pied, lutherie.",
  languages: [
    { language: "Français", level: "Natif" },
    { language: "Anglais", level: "C1" },
  ],
  projects: [],
  skills: {
    hard: ["TypeScript", "PostgreSQL", "Docker"],
    soft: [],
  },
};

/** The same CV as a PDF text layer would hand it to us. */
const FLAT = `Alex Martin
Ingénieur plateforme
candidat@example.com | +33 6 12 34 56 78 | Lyon
linkedin.com/in/alex - github.com/alex

Profil
Ingénieur plateforme, huit ans d'expérience sur des chaînes de livraison TypeScript et PostgreSQL.

Expérience professionnelle
Ingénieur plateforme, Acme 01/2022 - présent
- Réduit le temps de build TypeScript de 40% en parallélisant la chaîne CI.
- Optimisé 12 requêtes PostgreSQL critiques, divisant par 3 la latence du rapport.
Développeur backend, Globex 03/2019 - 12/2021
- Standardisé 8 images Docker, réduisant de 60% la taille des conteneurs livrés.
- Encadré 3 développeurs sur la migration TypeScript de 40 services internes.

Formation
Master informatique, Université de Lyon 2016

Compétences
TypeScript, PostgreSQL, Docker

Langues
Français, Anglais

Certifications
Certified Kubernetes Administrator 2023`;

describe("adapter parity", () => {
  it("scores the same career within three points either way", () => {
    const structured = scoreAts(fromCvDocument(STRUCTURED)).overallScore;
    const flat = scoreAts(parseCvText(FLAT)).overallScore;

    expect(Math.abs(structured - flat)).toBeLessThanOrEqual(MAX_DIVERGENCE);
  });

  /**
   * Stronger than the overall tolerance, and the one that actually catches
   * drift: two adapters can land on the same total while disagreeing on every
   * dimension underneath.
   */
  it("agrees dimension by dimension, not merely on the total", () => {
    const scoresOf = (doc: Parameters<typeof scoreAts>[0]) =>
      Object.fromEntries(
        scoreAts(doc).dimensions.map((item) => [item.key, item.score]),
      );

    expect(scoresOf(parseCvText(FLAT))).toEqual(
      scoresOf(fromCvDocument(STRUCTURED)),
    );
  });

  it("agrees on which dimensions could be observed at all", () => {
    const statusesOf = (doc: Parameters<typeof scoreAts>[0]) =>
      scoreAts(doc)
        .dimensions.map((item) => `${item.key}:${item.status}`)
        .sort();

    expect(statusesOf(fromCvDocument(STRUCTURED))).toEqual(
      statusesOf(parseCvText(FLAT)),
    );
  });

  it("finds the same sections in both representations", () => {
    expect(parseCvText(FLAT).sections).toEqual(
      fromCvDocument(STRUCTURED).sections,
    );
  });

  it("reads the same skills out of both representations", () => {
    expect(
      parseCvText(FLAT).skills.map((skill) => skill.toLowerCase()).sort(),
    ).toEqual(
      fromCvDocument(STRUCTURED).skills.map((skill) => skill.toLowerCase()).sort(),
    );
  });

  it("recovers both experiences and their bullets from flat text", () => {
    const parsed = parseCvText(FLAT);

    expect(parsed.experiences).toHaveLength(2);
    expect(parsed.experiences.every((item) => item.bullets.length === 2)).toBe(
      true,
    );
  });
});
