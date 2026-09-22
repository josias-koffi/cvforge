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
