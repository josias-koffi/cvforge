import type { PromptSafeProfile } from "@cvforge/types";
import { describe, expect, it } from "vitest";
import {
  groundCertifications,
  groundProjects,
  lockEducation,
} from "./document-lock";
import { buildSourceIndex } from "./source-index";

function makeIndex(sections: Partial<PromptSafeProfile["profileSections"]>) {
  const profile: PromptSafeProfile = {
    headline: "",
    identity: { candidateToken: "[CANDIDATE]", city: "", firstName: "Jean" },
    profileSections: {
      certifications: [],
      education: [],
      experiences: [],
      interests: "",
      personalProjects: [],
      softSkills: [],
      summary: "",
      technicalSkills: [],
      ...sections,
    },
  };
  return buildSourceIndex(profile);
}

describe("lockEducation", () => {
  const source = {
    degree: "Master Informatique",
    description: "",
    honors: "Mention bien",
    institution: "Sorbonne",
    year: "2018",
  };

  it("rewrites degree, school, year and honours from the profile", () => {
    const { education } = lockEducation(
      [
        {
          degree: "Master of Science in Computer Engineering",
          description: "Spécialisation systèmes distribués",
          institution: "Sorbonne University",
          mention: "With highest honours",
          year: "2019",
        },
      ],
      [source],
    );

    expect(education[0]).toEqual({
      degree: "Master Informatique",
      description: "Spécialisation systèmes distribués",
      institution: "Sorbonne",
      mention: "Mention bien",
      year: "2018",
    });
  });

  it("reports a degree the candidate never obtained", () => {
    const { education, removals } = lockEducation(
      [
        {
          degree: "Master Informatique",
          description: "",
          institution: "Sorbonne",
          mention: "",
          year: "2018",
        },
        {
          degree: "MBA",
          description: "",
          institution: "HEC",
          mention: "",
          year: "2021",
        },
      ],
      [source],
    );

    expect(education).toHaveLength(1);
    expect(removals).toEqual([{ kind: "education", label: "MBA — HEC" }]);
  });
});

describe("groundCertifications", () => {
  it("keeps only certifications listed in the profile", () => {
    const index = makeIndex({
      certifications: [{ issuer: "Amazon", title: "AWS Cloud Practitioner", year: "2023" }],
    });

    const { certifications, removals } = groundCertifications(
      [
        { issuer: "Amazon", title: "AWS Cloud Practitioner", year: "2023" },
        { issuer: "CNCF", title: "Certified Kubernetes Administrator", year: "2024" },
      ],
      index,
    );

    expect(certifications).toHaveLength(1);
    expect(removals).toEqual([
      { kind: "certification", label: "Certified Kubernetes Administrator" },
    ]);
  });
});

describe("groundProjects", () => {
  it("keeps only projects listed in the profile", () => {
    const index = makeIndex({
      personalProjects: [
        { description: "Un agrégateur RSS", link: "", title: "Veille Tech" },
      ],
    });

    const { projects, removals } = groundProjects(
      [
        { description: "Un agrégateur RSS", title: "Veille Tech", url: "" },
        { description: "Inventé de toutes pièces", title: "SaaS Analytics", url: "" },
      ],
      index,
    );

    expect(projects).toHaveLength(1);
    expect(removals).toEqual([{ kind: "project", label: "SaaS Analytics" }]);
  });
});
