import { describe, expect, it } from "vitest";
import {
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
