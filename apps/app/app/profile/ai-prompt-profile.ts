import type { OnboardingDraft } from "../onboarding/draft";
import type { BaseProfile } from "./base-profile";

export const AI_CANDIDATE_TOKEN = "[CANDIDATE]";

export const AI_OMITTED_PROFILE_FIELDS = [
  "identity.lastName",
  "identity.phone",
  "identity.email",
  "identity.exactAddress",
  "additional.birthDate",
] as const;

export type PromptSafeProfile = {
  headline: string;
  identity: {
    candidateToken: typeof AI_CANDIDATE_TOKEN;
    city: string;
    firstName: string;
  };
  profileSections: BaseProfile["sections"];
  supplementalContext: {
    availabilityDate: string;
    availabilityMode: OnboardingDraft["additional"]["availabilityMode"];
    contractTypes: string;
    educationLevel: string;
    hasDrivingLicense: boolean;
    languages: string;
    salaryRange: string;
    targetSectors: string;
  };
};

export type LocalReinjectionField = {
  targetField: "identity.email" | "identity.lastName" | "identity.phone";
  value: string;
};

export type PromptPseudonymizationResult = {
  localReinjection: LocalReinjectionField[];
  omittedFields: readonly string[];
  promptProfile: PromptSafeProfile;
};

function trim(value: string) {
  return value.trim();
}

export function createPromptPseudonymization(
  profile: BaseProfile,
  additional?: OnboardingDraft["additional"],
): PromptPseudonymizationResult {
  return {
    localReinjection: [
      {
        targetField: "identity.lastName",
        value: trim(profile.identity.lastName),
      },
      {
        targetField: "identity.phone",
        value: trim(profile.identity.phone),
      },
      {
        targetField: "identity.email",
        value: trim(profile.identity.email),
      },
    ],
    omittedFields: AI_OMITTED_PROFILE_FIELDS,
    promptProfile: {
      headline: trim(profile.headline),
      identity: {
        candidateToken: AI_CANDIDATE_TOKEN,
        city: trim(profile.identity.city),
        firstName: trim(profile.identity.firstName),
      },
      profileSections: profile.sections,
      supplementalContext: {
        availabilityDate: trim(additional?.availabilityDate ?? ""),
        availabilityMode: additional?.availabilityMode ?? "",
        contractTypes: trim(additional?.contractTypes ?? ""),
        educationLevel: trim(additional?.educationLevel ?? ""),
        hasDrivingLicense: additional?.hasDrivingLicense ?? false,
        languages: trim(additional?.languages ?? ""),
        salaryRange: trim(additional?.salaryRange ?? ""),
        targetSectors: trim(additional?.targetSectors ?? ""),
      },
    },
  };
}
