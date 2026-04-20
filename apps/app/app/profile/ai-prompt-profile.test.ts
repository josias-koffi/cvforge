import { describe, expect, it } from "vitest";
import { createEmptyDraft } from "../onboarding/draft";
import { createEmptyBaseProfile } from "./base-profile";
import {
  AI_CANDIDATE_TOKEN,
  AI_OMITTED_PROFILE_FIELDS,
  createPromptPseudonymization,
} from "./ai-prompt-profile";

describe("AI prompt pseudonymization", () => {
  it("keeps forbidden fields out of the prompt payload and identifies local reinjection", () => {
    const profile = createEmptyBaseProfile("candidate@example.com");
    profile.headline = "Product designer";
    profile.identity.firstName = "Jane";
    profile.identity.lastName = "Doe";
    profile.identity.city = "Paris";
    profile.identity.phone = "+33 6 12 34 56 78";
    profile.sections.summary = "Je structure des experiences complexes.";

    const draft = createEmptyDraft("candidate@example.com");
    draft.additional.birthDate = "1992-08-14";
    draft.additional.languages = "Francais, Anglais";
    draft.additional.targetSectors = "SaaS";

    const result = createPromptPseudonymization(profile, draft.additional);

    expect(result.promptProfile.identity).toEqual({
      candidateToken: AI_CANDIDATE_TOKEN,
      city: "Paris",
      firstName: "Jane",
    });
    expect(result.promptProfile.supplementalContext.languages).toBe("Francais, Anglais");
    expect(result.promptProfile.supplementalContext.targetSectors).toBe("SaaS");
    expect(result.promptProfile.supplementalContext).not.toHaveProperty("birthDate");
    expect(result.localReinjection).toEqual([
      { targetField: "identity.lastName", value: "Doe" },
      { targetField: "identity.phone", value: "+33 6 12 34 56 78" },
      { targetField: "identity.email", value: "candidate@example.com" },
    ]);
    expect(result.omittedFields).toEqual(AI_OMITTED_PROFILE_FIELDS);
  });

  it("returns a stable empty-safe contract when optional values are missing", () => {
    const result = createPromptPseudonymization(createEmptyBaseProfile("empty@example.com"));

    expect(result.promptProfile.identity).toEqual({
      candidateToken: AI_CANDIDATE_TOKEN,
      city: "",
      firstName: "",
    });
    expect(result.promptProfile.supplementalContext).toEqual({
      availabilityDate: "",
      availabilityMode: "",
      contractTypes: "",
      educationLevel: "",
      hasDrivingLicense: false,
      languages: "",
      salaryRange: "",
      targetSectors: "",
    });
    expect(result.localReinjection).toEqual([
      { targetField: "identity.lastName", value: "" },
      { targetField: "identity.phone", value: "" },
      { targetField: "identity.email", value: "empty@example.com" },
    ]);
  });
});
