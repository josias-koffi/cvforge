import { ATS_SCORE_ENGINE_VERSION } from "@cvforge/ats-score";
import type { CVDocumentContent, ExtractedOfferFields } from "@cvforge/types";
import { describe, expect, it, vi } from "vitest";
import {
  scoreGeneratedCv,
  scoreGeneratedCvSafely,
} from "./cv-generation.scoring";
import { withScore } from "./cv-generation.versions";

function makeContent(
  overrides: Partial<CVDocumentContent> = {},
): CVDocumentContent {
  return {
    candidate: {
      city: "Lyon",
      email: "alex@example.com",
      firstName: "Alex",
      github: "github.com/alex",
      lastName: "Martin",
      linkedin: "linkedin.com/in/alex",
      phone: "0612345678",
      summary:
        "Ingenieur plateforme, huit ans d'experience sur des chaines de livraison continues. Je concois et fiabilise les outils internes qui permettent aux equipes produit de livrer plusieurs fois par jour, en gardant la maitrise des couts d'infrastructure et la qualite de service attendue par les clients de la plateforme.",
      title: "Ingenieur plateforme",
    },
    certifications: [],
    education: [
      {
        degree: "Master informatique",
        description: "Systemes repartis.",
        institution: "Lyon",
        mention: "Bien",
        year: "2016",
      },
    ],
    experiences: [
      {
        achievements: [
          "Reduit le temps de build TypeScript de 40% en parallelisant la chaine CI utilisee par 12 equipes produit.",
          "Optimise 12 requetes PostgreSQL critiques, divisant par 3 la latence du rapport mensuel consulte par 400 clients.",
          "Concu la strategie de deploiement progressif qui a fait passer le taux d'incident en production de 8% a 2% par trimestre.",
          "Industrialise la supervision applicative sur 30 services, ramenant le delai moyen de detection de 25 minutes a 4 minutes.",
        ],
        company: "Acme",
        description: "",
        endDate: "present",
        position: "Ingenieur plateforme",
        startDate: "01/2022",
      },
      {
        achievements: [
          "Standardise 8 images Docker, reduisant de 60% la taille des conteneurs livres en production.",
          "Encadre 3 developpeurs juniors sur la migration TypeScript de 40 services internes, achevee avec 2 semaines d'avance.",
          "Automatise la generation des environnements de test, economisant environ 15 heures par semaine a l'equipe qualite.",
          "Migre la base PostgreSQL vers une version majeure sans interruption de service pour 200 000 utilisateurs actifs.",
        ],
        company: "Globex",
        description: "",
        endDate: "12/2021",
        position: "Developpeur backend",
        startDate: "03/2019",
      },
    ],
    interests: "",
    languages: [{ language: "Francais", level: "Natif" }],
    projects: [],
    skills: { hard: ["TypeScript", "PostgreSQL"], soft: [] },
    ...overrides,
  };
}

const OFFER: ExtractedOfferFields = {
  companyName: "Acme",
  contractType: "CDI",
  language: "fr",
  location: "Lyon",
  requirements: ["typescript", "postgresql", "docker"],
  responsibilities: ["fiabiliser la chaine de livraison"],
  salaryRange: "",
  summary: "Poste plateforme",
  title: "Ingenieur plateforme",
};

describe("scoreGeneratedCv", () => {
  it("scores a generated CV without a model call or a credit", () => {
    const result = scoreGeneratedCv(makeContent(), null);

    expect(result.overallScore).toBeGreaterThan(0);
    expect(result.engineVersion).toBe(ATS_SCORE_ENGINE_VERSION);
    // The model is never consulted on this path: the document is already
    // structured, so the deterministic rules suffice.
    expect(result.llmApplied).toBe(false);
  });

  /** The offer is attached to the application, so relevance is observable here. */
  it("scores the match when the application carries an offer", () => {
    const withOffer = scoreGeneratedCv(makeContent(), OFFER);
    const without = scoreGeneratedCv(makeContent(), null);

    const scored = (r: typeof withOffer) =>
      r.dimensions.filter((d) => d.status === "scored").length;

    expect(scored(withOffer)).toBeGreaterThan(scored(without));
  });

  /** No file exists until the PDF is exported, so readability is not judged. */
  it("leaves machine readability unavailable", () => {
    const dimension = scoreGeneratedCv(makeContent(), null).dimensions.find(
      (item) => item.key === "machineReadability",
    );

    expect(dimension?.status).toBe("unavailable");
    expect(dimension?.unavailableReason).toBe("NO_FILE_SIGNALS");
  });

  it("is deterministic, so a save that changes nothing changes no score", () => {
    const content = makeContent();

    expect(scoreGeneratedCv(content, OFFER)).toEqual(
      scoreGeneratedCv(content, OFFER),
    );
  });

  it("reflects an edit that removes the figures", () => {
    const flat = makeContent({
      experiences: [
        {
          achievements: [
            "Participe a la chaine de livraison continue interne utilisee par les equipes produit au quotidien.",
            "Intervient sur les requetes de la base de donnees et sur la supervision applicative des services.",
            "Accompagne les equipes sur les deploiements et sur le suivi des incidents en production.",
            "Contribue aux rituels d'equipe et a la documentation technique de la plateforme interne.",
          ],
          company: "Acme",
          description: "",
          endDate: "present",
          position: "Ingenieur plateforme",
          startDate: "01/2022",
        },
      ],
    });

    expect(scoreGeneratedCv(flat, null).overallScore).toBeLessThan(
      scoreGeneratedCv(makeContent(), null).overallScore,
    );
  });
});

/**
 * A CV the user has paid for must reach them even if the engine trips on some
 * document shape we did not anticipate.
 */
describe("scoreGeneratedCvSafely", () => {
  it("returns the score when everything works", () => {
    expect(scoreGeneratedCvSafely(makeContent(), null)).not.toBeNull();
  });

  it("returns null instead of throwing when scoring fails", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    // A document missing the shape the adapter reads.
    const broken = { candidate: null } as unknown as CVDocumentContent;

    expect(scoreGeneratedCvSafely(broken, null)).toBeNull();
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });
});

describe("withScore", () => {
  const versions = [
    {
      content: makeContent(),
      createdAt: "2026-09-22T10:00:00.000Z",
      id: "app-1-cv-v1",
      source: "generation" as const,
      templateId: null,
      versionNumber: 1,
    },
    {
      content: makeContent(),
      createdAt: "2026-09-22T11:00:00.000Z",
      id: "app-1-cv-v2",
      source: "manual_save" as const,
      templateId: null,
      versionNumber: 2,
    },
  ];

  it("stamps the score and the scale on the version just appended", () => {
    const score = scoreGeneratedCv(makeContent(), null);

    const stamped = withScore(versions, score);

    expect(stamped[1]?.atsScore).toBe(score.overallScore);
    expect(stamped[1]?.atsEngineVersion).toBe(ATS_SCORE_ENGINE_VERSION);
  });

  it("leaves the earlier versions untouched", () => {
    const stamped = withScore(versions, scoreGeneratedCv(makeContent(), null));

    expect(stamped[0]).toEqual(versions[0]);
  });

  /** A failed scoring must not record a zero, which would read as a bad CV. */
  it("leaves the version unstamped when there is no score", () => {
    expect(withScore(versions, null)).toEqual(versions);
    expect(withScore(versions, null)[1]?.atsScore).toBeUndefined();
  });

  it("tolerates an empty version list", () => {
    expect(withScore([], scoreGeneratedCv(makeContent(), null))).toEqual([]);
  });
});
