import type { PromptSafeProfile, SkillCategory } from "@cvforge/types";
import { describe, expect, it } from "vitest";
import { groundLanguages, groundSkills } from "./skill-grounding";
import { buildSourceIndex } from "./source-index";

function makeProfile(
  sections: Partial<PromptSafeProfile["profileSections"]> = {},
): PromptSafeProfile {
  return {
    headline: "",
    identity: { candidateToken: "[CANDIDATE]", city: "Paris", firstName: "Jean" },
    profileSections: {
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

function ground(
  profile: PromptSafeProfile,
  categories: SkillCategory[] | undefined,
  hard: string[] = [],
) {
  return groundSkills(categories, hard, buildSourceIndex(profile), profile);
}

describe("groundLanguages", () => {
  const profile = makeProfile({
    languages: [
      { language: "Français", level: "Langue maternelle" },
      { language: "Anglais", level: "B2 / Intermédiaire" },
    ],
  });

  it("keeps a listed language and restores the profile's own level", () => {
    const result = groundLanguages(
      [{ language: "Anglais", level: "C2 / Bilingue" }],
      buildSourceIndex(profile),
    );

    expect(result.languages).toEqual([
      { language: "Anglais", level: "B2 / Intermédiaire" },
    ]);
    expect(result.removals).toEqual([]);
  });

  it("matches the profile regardless of accents and case", () => {
    const result = groundLanguages(
      [{ language: "francais", level: "" }],
      buildSourceIndex(profile),
    );

    expect(result.languages[0].level).toBe("Langue maternelle");
  });

  it("drops a language the candidate never claimed", () => {
    const result = groundLanguages(
      [{ language: "Mandarin", level: "C1 / Courant" }],
      buildSourceIndex(profile),
    );

    expect(result.languages).toEqual([]);
    expect(result.removals).toEqual([
      { kind: "language", label: "Mandarin" },
    ]);
  });

  it("returns nothing when the profile lists no language", () => {
    const result = groundLanguages(
      [{ language: "Anglais", level: "C1" }],
      buildSourceIndex(makeProfile()),
    );

    expect(result.languages).toEqual([]);
  });
});

describe("groundSkills", () => {
  it("drops tools the model borrowed from the job offer", () => {
    const profile = makeProfile({ technicalSkills: ["React", "Node.js"] });
    const result = ground(profile, [
      { label: "Tech", items: ["React", "Kubernetes", "Terraform"] },
    ]);

    expect(result.categories).toEqual([{ label: "Tech", items: ["React"] }]);
    expect(result.removals.map((removal) => removal.label)).toEqual([
      "Kubernetes",
      "Terraform",
    ]);
  });

  it("refuses a more specific technology than the profile claims", () => {
    const profile = makeProfile({ technicalSkills: ["React"] });
    const result = ground(profile, [
      { label: "Tech", items: ["React Native"] },
    ]);

    expect(result.hard).not.toContain("React Native");
  });

  it("accepts a broader technology the profile already covers", () => {
    const profile = makeProfile({ technicalSkills: ["React Native"] });
    const result = ground(profile, [{ label: "Tech", items: ["React"] }]);

    expect(result.hard).toEqual(["React"]);
    expect(result.removals).toEqual([]);
  });

  it("accepts a known alias of a listed skill", () => {
    const profile = makeProfile({ technicalSkills: ["JavaScript"] });
    const result = ground(profile, [{ label: "Tech", items: ["JS"] }]);

    expect(result.hard).toEqual(["JS"]);
  });

  it("does not let a prefix vouch for a different language", () => {
    const profile = makeProfile({ technicalSkills: ["Java"] });
    const result = ground(profile, [{ label: "Tech", items: ["JavaScript"] }]);

    expect(result.hard).not.toContain("JavaScript");
  });

  it("keeps a skill only mentioned in an experience write-up", () => {
    const profile = makeProfile({
      experiences: [
        {
          company: "Tech Corp",
          period: "2020-2023",
          results: "Mise en production de pipelines Docker",
          role: "DevOps",
        },
      ],
      technicalSkills: ["Bash"],
    });
    const result = ground(profile, [{ label: "Infra", items: ["Docker"] }]);

    expect(result.hard).toContain("Docker");
  });

  it("removes a category left without a single sourced item", () => {
    const profile = makeProfile({ technicalSkills: ["Excel"] });
    const result = ground(profile, [
      { label: "Bureautique", items: ["Excel"] },
      { label: "Cloud", items: ["AWS", "GCP"] },
    ]);

    expect(result.categories).toEqual([
      { label: "Bureautique", items: ["Excel"] },
    ]);
  });

  it("falls back to the profile rather than render a CV with no skills", () => {
    const profile = makeProfile({ technicalSkills: ["Excel"] });
    const result = ground(profile, [
      { label: "Cloud", items: ["AWS", "GCP", "Terraform"] },
    ]);

    expect(result.categories).toEqual([
      { label: "Compétences", items: ["Excel"] },
    ]);
    expect(result.removals).toHaveLength(3);
  });

  it("leaves category labels alone, since a label is not a claim", () => {
    const profile = makeProfile({ technicalSkills: ["Scrum"] });
    const result = ground(profile, [
      { label: "Pratiques agiles", items: ["Scrum"] },
    ]);

    expect(result.categories?.[0].label).toBe("Pratiques agiles");
  });

  it("filters a flat skill list when the model returned no categories", () => {
    const profile = makeProfile({ technicalSkills: ["Python"] });
    const result = ground(profile, undefined, ["Python", "Rust"]);

    expect(result.hard).toEqual(["Python"]);
    expect(result.removals.map((removal) => removal.label)).toEqual(["Rust"]);
  });
});
