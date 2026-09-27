import { describe, expect, it } from "vitest";
import {
  normalizeCvJson,
  normalizeSkillCategories,
  normalizeUpdatedCvContent,
} from "./cv-generation.normalizers";
import type { CVDocumentContent } from "@cvforge/types";

const BASE_CV: CVDocumentContent = {
  candidate: {
    city: "Paris",
    email: "",
    firstName: "Jean",
    github: "",
    lastName: "Dupont",
    linkedin: "",
    phone: "",
    summary: "",
    title: "Développeur",
  },
  certifications: [],
  education: [],
  experiences: [],
  interests: "",
  languages: [],
  projects: [],
  skills: { hard: [], soft: [] },
};

describe("CV generation normalizers", () => {
  it("accepts category as an alias and normalizes it to label", () => {
    expect(
      normalizeSkillCategories([
        { category: "Frontend", items: ["React", "TypeScript"] },
      ]),
    ).toEqual([{ label: "Frontend", items: ["React", "TypeScript"] }]);
  });

  it("limits output to five categories and six unique items each", () => {
    const categories = normalizeSkillCategories(
      Array.from({ length: 7 }, (_, categoryIndex) => ({
        label: `Catégorie ${categoryIndex}`,
        items: Array.from(
          { length: 8 },
          (_, itemIndex) => `Skill ${categoryIndex}-${itemIndex}`,
        ),
      })),
    );

    expect(categories).toHaveLength(5);
    expect(categories?.every((category) => category.items.length === 6)).toBe(
      true,
    );
  });

  it("removes exact duplicates globally and rejects catch-all labels", () => {
    expect(
      normalizeSkillCategories([
        { label: "Frontend", items: ["React", "TypeScript", "React"] },
        { label: "Autres compétences", items: ["Docker"] },
        { label: "Backend", items: ["TypeScript", "NestJS"] },
      ]),
    ).toEqual([
      { label: "Frontend", items: ["React", "TypeScript"] },
      { label: "Backend", items: ["NestJS"] },
    ]);
  });

  it("preserves normalized categories when CV content is saved", () => {
    const normalized = normalizeUpdatedCvContent({
      ...BASE_CV,
      skills: {
        hard: [" React ", "React", "NestJS"],
        soft: [],
        categories: [
          { label: " Frontend ", items: [" React ", "TypeScript"] },
          { label: " Backend ", items: ["TypeScript", " NestJS "] },
        ],
      },
    });

    expect(normalized.skills).toEqual({
      hard: ["React", "NestJS"],
      soft: [],
      categories: [
        { label: "Frontend", items: ["React", "TypeScript"] },
        { label: "Backend", items: ["NestJS"] },
      ],
    });
  });
});

describe("normalizeCvJson — chronology", () => {
  const profile = {
    profileSections: { interests: "" },
  } as never as Parameters<typeof normalizeCvJson>[2];

  function order(endDates: string[]) {
    const raw = {
      experiences: endDates.map((endDate, index) => ({
        achievements: [],
        company: `C${index}`,
        endDate,
        position: `P${index}`,
        startDate: "2019",
      })),
    };

    return normalizeCvJson(
      raw as never,
      { email: "a@b.c", lastName: "Dupont", phone: "+33600000000" },
      profile,
    ).experiences.map((experience) => experience.endDate);
  }

  /**
   * The score docks a CV that is not in reverse chronology, so the generator
   * has to produce it — a real CV listed a finished role above one still
   * running and lost the points for it.
   */
  it("puts the most recent experience first", () => {
    expect(order(["2021", "Fév. 2026", "2024"])).toEqual([
      "Fév. 2026",
      "2024",
      "2021",
    ]);
  });

  it("puts an ongoing role above every dated one", () => {
    expect(order(["2026", "Présent"])).toEqual(["Présent", "2026"]);
  });

  it("leaves undated entries where they were rather than shuffling a career", () => {
    expect(order(["2021", "", "2024"])).toEqual(["2024", "2021", ""]);
  });
});

describe("normalizeCvJson — repetition", () => {
  const profile = {
    profileSections: { interests: "" },
  } as never as Parameters<typeof normalizeCvJson>[2];

  function achievementsOf(description: string, achievements: string[]) {
    return normalizeCvJson(
      {
        experiences: [
          {
            achievements,
            company: "Acme",
            description,
            endDate: "2024",
            position: "Développeur",
            startDate: "2021",
          },
        ],
      } as never,
      { email: "a@b.c", lastName: "Dupont", phone: "+33600000000" },
      profile,
    ).experiences[0]?.achievements;
  }

  /**
   * Description and achievements are both built from the same `results` field,
   * so the collision is structural. A real generated CV shipped this exact
   * pair.
   */
  it("drops an achievement that only reformulates the role's context", () => {
    expect(
      achievementsOf("Développement d'un portail patient utilisé par 40 000 personnes.", [
        "Migration de l'API monolithique vers des services NestJS",
        "Développement du portail patient utilisé par 40 000 personnes",
      ]),
    ).toEqual(["Migration de l'API monolithique vers des services NestJS"]);
  });

  it("drops an achievement repeated twice", () => {
    expect(
      achievementsOf("", [
        "Conception et scénographie de pop-up stores en point de vente",
        "Conception et scénographie de pop-up stores en point de vente",
      ]),
    ).toHaveLength(1);
  });

  it("keeps two achievements that merely share a verb", () => {
    expect(
      achievementsOf("", [
        "Création du département marketing digital du groupe",
        "Création de la gamme Dynamis et de son positionnement",
      ]),
    ).toHaveLength(2);
  });

  /** Too short for overlap to carry any meaning. */
  it("keeps short achievements even when they look alike", () => {
    expect(achievementsOf("", ["Encadrement de deux juniors", "Encadrement des revues"])).toHaveLength(2);
  });
});
