import { describe, expect, it } from "vitest";
import {
  buildAnalysisUserMessage,
  readAnalysisResponse,
  type AnalysisOffer,
  type AnalysisProfile,
} from "./job-alert-analysis";

const PROFILE: AnalysisProfile = {
  experiences: [{ period: "2021 – 2024", role: "Développeuse full stack" }],
  headline: "Développeuse full stack",
  skills: ["TypeScript", "React", "PostgreSQL"],
};

const OFFER: AnalysisOffer = {
  companyName: "Doctolib",
  contractType: "cdi",
  description: "Nous cherchons une personne en React et Kubernetes.",
  locationLabel: "Nantes",
  matchedSkills: ["React"],
  missingSkills: ["Kubernetes"],
  remote: false,
  salaryLabel: "",
  title: "Développeur full stack",
};

function read(raw: unknown) {
  return readAnalysisResponse(raw, { offer: OFFER, profile: PROFILE });
}

describe("readAnalysisResponse", () => {
  it("reads a well-formed answer", () => {
    expect(
      read({
        aMettreEnAvant: [
          { competences: ["React"], texte: "Vos projets React en production" },
        ],
        raisons: [
          {
            competences: ["TypeScript", "React"],
            texte: "Même stack que votre poste",
          },
          {
            experiences: ["Développeuse full stack"],
            texte: "Dans la continuité de votre poste",
          },
        ],
        verdict: "a_saisir",
        vigilance: ["Kubernetes est demandé et absent de votre profil"],
      }),
    ).toEqual({
      highlights: ["Vos projets React en production"],
      reasons: [
        "Même stack que votre poste",
        "Dans la continuité de votre poste",
      ],
      verdict: "seize",
      watchouts: ["Kubernetes est demandé et absent de votre profil"],
    });
  });

  it("accepts the verdict however it is spelled", () => {
    expect(read({ verdict: "À considérer" })?.verdict).toBe("consider");
    expect(read({ verdict: "a passer" })?.verdict).toBe("skip");
  });

  it("rejects an answer without a usable verdict: nothing is charged for it", () => {
    expect(read({ raisons: ["Bien"], verdict: "excellent" })).toBeNull();
    expect(read(null)).toBeNull();
    expect(read("pas du JSON")).toBeNull();
  });

  it("drops a point citing a skill or an experience the profile does not hold", () => {
    const analysis = read({
      aMettreEnAvant: [
        { competences: ["Go"], texte: "Votre expérience en Go" },
        { competences: ["postgresql"], texte: "Vos requêtes PostgreSQL" },
      ],
      raisons: [
        {
          experiences: ["Directrice technique"],
          texte: "Votre passé de directrice technique",
        },
        { competences: ["React"], texte: "React, votre point fort" },
      ],
      verdict: "a_saisir",
    });

    expect(analysis?.reasons).toEqual(["React, votre point fort"]);
    expect(analysis?.highlights).toEqual(["Vos requêtes PostgreSQL"]);
  });

  it("drops a point handing the candidate a skill the offer asks and the profile lacks", () => {
    const analysis = read({
      raisons: [
        { competences: [], texte: "Votre maîtrise de Kubernetes" },
        "Une équipe produit à taille humaine",
      ],
      verdict: "a_considerer",
    });

    expect(analysis?.reasons).toEqual(["Une équipe produit à taille humaine"]);
  });

  it("keeps three points at most, short and without duplicates", () => {
    const analysis = read({
      raisons: ["Un", "Un", "Deux", "Trois", "Quatre"],
      verdict: "a_saisir",
      vigilance: ["x".repeat(500)],
    });

    expect(analysis?.reasons).toEqual(["Un", "Deux", "Trois"]);
    expect(analysis?.watchouts[0]).toHaveLength(240);
  });
});

describe("buildAnalysisUserMessage", () => {
  it("gives the model what the candidate does, never who they are", () => {
    const message = buildAnalysisUserMessage(PROFILE, OFFER);

    expect(message).toContain(
      '"competences":["TypeScript","React","PostgreSQL"]',
    );
    expect(message).toContain('"poste":"Développeuse full stack"');
    expect(message).toContain(
      '"competencesDemandeesAbsentesDuProfil":["Kubernetes"]',
    );
    expect(message).not.toMatch(/@|nom|téléphone/i);
  });
});
