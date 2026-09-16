import { describe, expect, it } from "vitest";
import { createEmptyBaseProfile } from "./base-profile";
import {
  AI_CANDIDATE_TOKEN,
  AI_OMITTED_PROFILE_FIELDS,
  buildLocalFields,
  buildPromptProfile,
} from "./ai-prompt-profile";

function makeProfile() {
  const profile = createEmptyBaseProfile("candidate@example.com");
  profile.headline = "Product designer";
  profile.identity.firstName = "Jane";
  profile.identity.lastName = "Doe";
  profile.identity.city = "Paris";
  profile.identity.phone = "+33 6 12 34 56 78";
  profile.identity.linkedIn = "linkedin.com/in/jane-doe";
  profile.sections.summary = "Je structure des experiences complexes.";
  return profile;
}

describe("AI prompt pseudonymization", () => {
  it("keeps every omitted field out of what reaches the model", () => {
    const promptProfile = buildPromptProfile(makeProfile());
    const payload = JSON.stringify(promptProfile);

    expect(promptProfile.identity).toEqual({
      candidateToken: AI_CANDIDATE_TOKEN,
      city: "Paris",
      firstName: "Jane",
    });
    expect(payload).not.toMatch(/Doe|\+33|candidate@example/);
    expect(AI_OMITTED_PROFILE_FIELDS).toContain("identity.lastName");
  });

  it("hands the identifiers to the local re-injection instead", () => {
    expect(buildLocalFields(makeProfile())).toEqual({
      email: "candidate@example.com",
      github: "",
      lastName: "Doe",
      linkedin: "linkedin.com/in/jane-doe",
      phone: "+33 6 12 34 56 78",
    });
  });

  it("stays empty-safe on a blank profile", () => {
    const profile = createEmptyBaseProfile("empty@example.com");

    expect(buildPromptProfile(profile).identity).toEqual({
      candidateToken: AI_CANDIDATE_TOKEN,
      city: "",
      firstName: "",
    });
    expect(buildLocalFields(profile).lastName).toBe("");
  });

  it("carries the languages captured during onboarding", () => {
    const profile = createEmptyBaseProfile("candidate@example.com");
    profile.sections.languages = [
      { language: "Francais", level: "C2" },
      { language: "Anglais", level: "B2" },
    ];

    expect(buildPromptProfile(profile).profileSections.languages).toEqual([
      { language: "Francais", level: "C2" },
      { language: "Anglais", level: "B2" },
    ]);
  });
});
