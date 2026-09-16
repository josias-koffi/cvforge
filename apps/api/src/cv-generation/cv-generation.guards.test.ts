import type { PromptSafeProfile } from "@cvforge/types";
import { UnprocessableEntityException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import {
  EMPTY_PROFILE_MESSAGE,
  assertProfileIsGroundable,
} from "./cv-generation.guards";

function makeProfile(
  sections: Partial<PromptSafeProfile["profileSections"]> = {},
): PromptSafeProfile {
  return {
    headline: "",
    identity: { candidateToken: "[CANDIDATE]", city: "", firstName: "Jean" },
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

describe("assertProfileIsGroundable", () => {
  it("refuses a profile the model could only invent from", () => {
    expect(() => assertProfileIsGroundable(makeProfile())).toThrow(
      UnprocessableEntityException,
    );
  });

  it("tells the candidate no credit was spent", () => {
    expect(EMPTY_PROFILE_MESSAGE).toContain("Aucun credit");
  });

  it("accepts a profile carrying a single experience", () => {
    const profile = makeProfile({
      experiences: [
        { company: "Tech Corp", period: "2021", results: "API", role: "Dev" },
      ],
    });

    expect(() => assertProfileIsGroundable(profile)).not.toThrow();
  });

  it("accepts a profile carrying only skills", () => {
    expect(() =>
      assertProfileIsGroundable(makeProfile({ technicalSkills: ["Python"] })),
    ).not.toThrow();
  });
});
