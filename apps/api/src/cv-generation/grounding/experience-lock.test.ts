import type { ExperienceItemProps, PromptSafeProfileSections } from "@cvforge/types";
import { describe, expect, it } from "vitest";
import { lockExperiences } from "./experience-lock";

type SourceExperience = PromptSafeProfileSections["experiences"][number];

const SOURCE: SourceExperience = {
  company: "Tech Corp",
  period: "2021 - 2023",
  results: "Refonte de l'API de facturation",
  role: "Backend Developer",
};

function generated(
  overrides: Partial<ExperienceItemProps> = {},
): ExperienceItemProps {
  return {
    achievements: ["Refondu l'API de facturation"],
    company: "Tech Corp",
    description: "Équipe plateforme",
    endDate: "Déc. 2023",
    position: "Backend Developer",
    startDate: "Jan. 2021",
    ...overrides,
  };
}

describe("lockExperiences", () => {
  it("keeps a nicer date format that describes the same years", () => {
    const { experiences } = lockExperiences([generated()], [SOURCE]);

    expect(experiences[0].startDate).toBe("Jan. 2021");
    expect(experiences[0].endDate).toBe("Déc. 2023");
  });

  it("falls back to the source period when the years do not match", () => {
    const { experiences } = lockExperiences(
      [generated({ startDate: "Jan. 2019", endDate: "Déc. 2023" })],
      [SOURCE],
    );

    expect(experiences[0].startDate).toBe("2021");
    expect(experiences[0].endDate).toBe("2023");
  });

  it("overwrites an embellished company name and job title", () => {
    const { experiences, lockedExperiences } = lockExperiences(
      [generated({ company: "Tech Corporation SAS", position: "Lead Engineer" })],
      [SOURCE],
    );

    expect(experiences[0].company).toBe("Tech Corp");
    expect(experiences[0].position).toBe("Backend Developer");
    expect(lockedExperiences).toBe(1);
  });

  it("removes an experience the candidate never had", () => {
    const { experiences, removals } = lockExperiences(
      [
        generated(),
        generated({
          company: "Google",
          endDate: "Déc. 2024",
          position: "Software Engineer",
          startDate: "Jan. 2024",
        }),
      ],
      [SOURCE],
    );

    expect(experiences).toHaveLength(1);
    expect(removals).toContainEqual({
      kind: "experience",
      label: "Software Engineer — Google",
    });
  });

  it("restores a source experience the model dropped", () => {
    const second: SourceExperience = {
      company: "Startup SAS",
      period: "2019 - 2021",
      results: "Développement du back-office",
      role: "Développeur",
    };

    const { experiences } = lockExperiences([generated()], [SOURCE, second]);

    expect(experiences).toHaveLength(2);
    expect(experiences[1].company).toBe("Startup SAS");
    expect(experiences[1].achievements).toEqual([
      "Développement du back-office",
    ]);
  });

  it("restores the source order when the model reorders", () => {
    const second: SourceExperience = {
      company: "Startup SAS",
      period: "2019 - 2021",
      results: "Développement du back-office",
      role: "Développeur",
    };

    const { experiences } = lockExperiences(
      [
        generated({
          company: "Startup SAS",
          endDate: "2021",
          position: "Développeur",
          startDate: "2019",
        }),
        generated(),
      ],
      [SOURCE, second],
    );

    expect(experiences.map((item) => item.company)).toEqual([
      "Tech Corp",
      "Startup SAS",
    ]);
  });

  it("drops a bullet whose figure the profile never states", () => {
    const { experiences, removals } = lockExperiences(
      [
        generated({
          achievements: [
            "Refondu l'API de facturation",
            "Réduit le TTFB de 40 %",
          ],
        }),
      ],
      [SOURCE],
    );

    expect(experiences[0].achievements).toEqual(["Refondu l'API de facturation"]);
    expect(removals).toContainEqual({
      context: "Tech Corp",
      kind: "achievement",
      label: "Réduit le TTFB de 40 %",
    });
  });

  it("keeps a figure the profile does state", () => {
    const source: SourceExperience = {
      ...SOURCE,
      results: "Migration de 3 services vers une architecture modulaire",
    };
    const { experiences } = lockExperiences(
      [generated({ achievements: ["Migré 3 services critiques"] })],
      [source],
    );

    expect(experiences[0].achievements).toEqual(["Migré 3 services critiques"]);
  });

  it("falls back to the source results when every bullet is unsourced", () => {
    const { experiences } = lockExperiences(
      [generated({ achievements: ["Augmenté le CA de 200 %"] })],
      [SOURCE],
    );

    expect(experiences[0].achievements).toEqual([
      "Refonte de l'API de facturation",
    ]);
  });

  it("returns nothing but removals when the profile has no experience", () => {
    const { experiences, removals } = lockExperiences([generated()], []);

    expect(experiences).toEqual([]);
    expect(removals).toHaveLength(1);
  });
});
