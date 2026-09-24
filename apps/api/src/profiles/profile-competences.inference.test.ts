import { describe, expect, it } from "vitest";
import type { RomeoCompetence } from "../rome/romeo.client";
import {
  competenceTexts,
  keptCompetences,
  textsFingerprint,
} from "./profile-competences.inference";
import type { StoredProfile } from "./profiles.types";

function profile(sections: Partial<StoredProfile["sections"]>): StoredProfile {
  return {
    headline: "Développeuse full-stack",
    id: "p1",
    identity: {} as StoredProfile["identity"],
    label: "Profil",
    meta: { lastSavedAt: null, maxProfiles: null, source: "storage" },
    preferences: {
      availabilityDate: "",
      availabilityMode: "",
      contractTypes: "",
    },
    sections: {
      certifications: [],
      education: [],
      experiences: [],
      interests: "",
      languages: [],
      personalProjects: [],
      softSkills: [],
      summary: "",
      technicalSkills: [],
      ...sections,
    },
  };
}

function competence(
  code: string,
  score: number,
  libelle = code,
): RomeoCompetence {
  return { code, libelle, score, textIndex: 0, type: "SAVOIR" };
}

describe("competenceTexts", () => {
  it("sends skills first, then each result, project and certification", () => {
    expect(
      competenceTexts(
        profile({
          certifications: [
            { issuer: "AWS", title: "AWS Solutions Architect", year: "" },
          ],
          education: [
            {
              degree: "Master informatique",
              description: "",
              honors: "",
              institution: "",
              year: "",
            },
          ],
          experiences: [
            {
              company: "Acme",
              period: "",
              results:
                "- Refonte du parcours de commande.\n• Encadrement de deux développeurs. Mise en place des tests end-to-end.",
              role: "Développeuse",
            },
          ],
          personalProjects: [
            {
              description: "Une application de recettes.",
              link: "",
              title: "Miam",
            },
          ],
          softSkills: ["Autonomie", " "],
          summary: "Six ans de développement web.",
          technicalSkills: ["TypeScript", "x"],
        }),
      ),
    ).toEqual([
      "TypeScript",
      "Autonomie",
      "Refonte du parcours de commande.",
      "Encadrement de deux développeurs.",
      "Mise en place des tests end-to-end.",
      "Une application de recettes.",
      "AWS Solutions Architect",
    ]);
  });

  it("keeps a sentence whole when its dot is not an end", () => {
    expect(
      competenceTexts(
        profile({
          experiences: [
            {
              company: "",
              period: "",
              results: "Migration vers Node.js et NestJS.",
              role: "",
            },
          ],
        }),
      ),
    ).toEqual(["Migration vers Node.js et NestJS."]);
  });
});

describe("textsFingerprint", () => {
  it("changes with the texts and with their order only", () => {
    const fingerprint = textsFingerprint(["TypeScript", "Docker"]);

    expect(textsFingerprint(["TypeScript", "Docker"])).toBe(fingerprint);
    expect(textsFingerprint(["Docker", "TypeScript"])).not.toBe(fingerprint);
    expect(textsFingerprint(["TypeScript"])).not.toBe(fingerprint);
    expect(fingerprint).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("keptCompetences", () => {
  it("keeps each confident code once, the best first, minus removed ones", () => {
    expect(
      keptCompetences(
        [
          competence("A", 0.72),
          competence("B", 0.69),
          competence("A", 0.9),
          competence("C", 0.8, "Zèbre"),
          competence("D", 0.8, "Abeille"),
          competence("E", 0.95),
        ],
        new Set(["E"]),
      ).map((entry) => [entry.code, entry.score]),
    ).toEqual([
      ["A", 0.9],
      ["D", 0.8],
      ["C", 0.8],
    ]);
  });

  it("stops at forty competences", () => {
    expect(
      keptCompetences(
        Array.from({ length: 50 }, (_, index) =>
          competence(`C${index}`, 0.99 - index / 1000),
        ),
        new Set(),
      ),
    ).toHaveLength(40);
  });
});
