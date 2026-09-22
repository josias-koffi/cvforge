import type { CVDocumentContent } from "@cvforge/types";
import { describe, expect, it } from "vitest";
import { fromCvDocument } from "./adapters/from-cv-document";
import { scoreImpactByRules } from "./dimensions/impact-rules";
import { scoreAts } from "./engine";
import { startsWithActionVerb } from "./lexicons";
import { makeDocument, makeExperience } from "./testing/make-document";

/**
 * The regression this file exists for.
 *
 * A CV our own generator produced — three roles, twelve bullets, quantified
 * results, a complete skills section — scored 65/100 on the very engine we sell
 * as the measure of an ATS-ready CV. Every bullet opened on a deverbal noun,
 * which is how French CVs are written, and the engine read that as prose with
 * no action in it. The scale was not measuring the CV; it was measuring how
 * American it sounded.
 */
const GENERATED_FR: CVDocumentContent = {
  candidate: {
    city: "Lyon",
    email: "camille@example.com",
    firstName: "Camille",
    github: "",
    lastName: "Rousseau",
    linkedin: "linkedin.com/in/camille",
    phone: "+33 6 11 22 33 44",
    summary:
      "Développeuse full-stack expérimentée sur applications web à fort trafic. Spécialisée TypeScript, React et Node.js, de la conception produit à la mise en production. 6 ans d'expertise en optimisation performance et mentorat.",
    title: "Développeuse full-stack senior",
  },
  certifications: [],
  education: [
    {
      degree: "Master informatique, génie logiciel",
      description: "Spécialité architectures distribuées et qualité logicielle.",
      institution: "Université Lyon 1",
      mention: "Bien",
      year: "2019",
    },
  ],
  experiences: [
    {
      achievements: [
        "Réduction du temps de chargement de 6 à 1,8 seconde sur le parcours de commande",
        "Encadrement de deux développeurs juniors",
        "Mise en place des tests end-to-end et du déploiement continu sur GitHub Actions",
      ],
      company: "Nordwind Studio",
      description:
        "Refonte du parcours de commande React et optimisation des performances Next.js.",
      endDate: "Présent",
      position: "Développeuse full-stack senior",
      startDate: "2023",
    },
    {
      achievements: [
        "Migration de l'API monolithique vers des services NestJS et PostgreSQL",
        "Accessibilité RGAA portée au niveau AA sur l'ensemble du portail",
        "Conteneurisation Docker de la chaîne de build et des environnements de test",
      ],
      company: "Latitude Santé",
      description:
        "Développement d'un portail patient TypeScript utilisé par 40 000 personnes.",
      endDate: "2023",
      position: "Développeuse full-stack",
      startDate: "2021",
    },
    {
      achievements: [
        "Création de l'interface de gestion des campagnes en React",
        "Design system partagé entre trois produits",
        "Réduction de 30 % des anomalies signalées en production",
      ],
      company: "Studio Vermeil",
      description:
        "Création d'interfaces de gestion et amélioration de la qualité logicielle.",
      endDate: "2021",
      position: "Développeuse front-end",
      startDate: "2019",
    },
  ],
  interests: "Course à pied, photographie argentique.",
  languages: [{ language: "Anglais", level: "B2 / Professionnel" }],
  projects: [],
  skills: {
    hard: [
      "TypeScript",
      "React",
      "Next.js",
      "Node.js",
      "NestJS",
      "PostgreSQL",
      "Docker",
      "GitHub Actions",
    ],
    soft: ["Mentorat"],
  },
};

const OFFER = {
  requirements: ["TypeScript", "React", "Node.js", "PostgreSQL"],
  responsibilities: ["Concevoir et développer des applications web"],
  title: "Développeur full-stack TypeScript",
};

describe("a CV written in French", () => {
  /**
   * The number that matters commercially: we sell ATS-ready CVs, so the CV we
   * generate has to survive our own measurement. Asserted as a floor, not an
   * equality — the scale may still be tuned, it may not slide back down.
   */
  it("scores in the nineties once the engine stops penalising its register", () => {
    const result = scoreAts(fromCvDocument(GENERATED_FR), { offer: OFFER });

    expect(result.overallScore).toBeGreaterThanOrEqual(90);
    expect(result.band).toBe("excellent");
    expect(result.cappedBy).toBeUndefined();
  });

  it("raises no finding that would be wrong to show its author", () => {
    const codes = scoreAts(fromCvDocument(GENERATED_FR), {
      offer: OFFER,
    }).findings.map((finding) => finding.code);

    expect(codes).not.toContain("MISSING_ACTION_VERBS");
    expect(codes).not.toContain("UNSUPPORTED_SKILLS");
    expect(codes).not.toContain("KEYWORD_STUFFING");
    expect(codes).not.toContain("TOO_SHORT");
  });
});

describe("startsWithActionVerb", () => {
  it.each([
    "Réduction du temps de build de 40 %",
    "Mise en place de la chaîne de déploiement continu",
    "Encadrement de deux développeurs juniors",
    "La refonte du tunnel de commande",
    "Réduit le temps de build de 40 %",
    "Reduced build time by 40%",
  ])("recognises the action in %j", (bullet) => {
    expect(startsWithActionVerb(bullet)).toBe(true);
  });

  it.each([
    "Accessibilité RGAA portée au niveau AA",
    "Responsable du périmètre facturation",
    "",
  ])("does not invent one in %j", (bullet) => {
    expect(startsWithActionVerb(bullet)).toBe(false);
  });
});

describe("skill evidence", () => {
  /**
   * The summary is where a French CV names its stack, and it names it once.
   * Demanding the proof inside a bullet asked the candidate to repeat their
   * technologies line after line — which is precisely what `keywords` flags as
   * stuffing.
   */
  it("accepts a skill the summary backs up rather than a bullet", () => {
    const doc = makeDocument({
      evidenceText: "Ingénieur plateforme, huit ans sur Kubernetes et Terraform.",
      experiences: [makeExperience({ bullets: ["Livré 4 chantiers de migration."] })],
      skills: ["kubernetes", "terraform"],
    });

    expect(scoreImpactByRules(doc).findings).not.toContainEqual(
      expect.objectContaining({ code: "UNSUPPORTED_SKILLS" }),
    );
  });

  it("still flags a stack the document never mentions again", () => {
    const doc = makeDocument({
      evidenceText: "Ingénieur plateforme.",
      skills: ["kubernetes", "terraform", "kafka"],
    });

    expect(scoreImpactByRules(doc).findings).toContainEqual(
      expect.objectContaining({ code: "UNSUPPORTED_SKILLS" }),
    );
  });
});

describe("impact sub-scores", () => {
  /**
   * Full marks must be reachable without writing for the parser. A CV whose
   * every single bullet carries a figure reads as manufactured; half of them
   * is already an excellent CV, and the scale says so.
   */
  it("gives full credit for quantification at half the bullets", () => {
    const halfQuantified = makeExperience({
      bullets: [
        "Réduction du temps de build de 40 % sur la chaîne d'intégration continue",
        "Encadrement de deux développeurs juniors sur la migration du socle",
      ],
    });

    const doc = makeDocument({
      evidenceText: "Ingénieur plateforme typescript postgresql",
      experiences: [halfQuantified],
      skills: ["typescript", "postgresql"],
    });

    expect(scoreImpactByRules(doc).score).toBe(100);
  });

  /**
   * The ceiling is for the CV that lists duties and never a result. Below the
   * floor but not at zero is a warning: it costs points, it does not cap.
   */
  it("warns rather than caps when some bullets carry figures", () => {
    const doc = makeDocument({
      experiences: [
        makeExperience({
          bullets: [
            "Réduction du temps de build de 40 % sur la chaîne d'intégration",
            "Encadrement des revues de code de l'équipe plateforme",
            "Migration du socle applicatif vers une architecture modulaire",
            "Animation des ateliers de conception avec les équipes produit",
          ],
        }),
      ],
    });

    expect(scoreImpactByRules(doc).findings).toContainEqual({
      code: "MISSING_QUANTIFICATION",
      dimension: "impact",
      severity: "warning",
    });
  });
});
