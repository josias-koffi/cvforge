import type {
  CvLocalFields,
  PromptSafeProfile,
} from "@cvforge/types";
import type { BaseProfile } from "./base-profile";

export const AI_CANDIDATE_TOKEN = "[CANDIDATE]";

/** Profile fields that never leave the device, whatever the generation flow. */
export const AI_OMITTED_PROFILE_FIELDS = [
  "identity.lastName",
  "identity.phone",
  "identity.email",
  "identity.exactAddress",
  "additional.birthDate",
] as const;

/** The pseudonymised half of the payload: everything the model is allowed to see. */
export function buildPromptProfile(profile: BaseProfile): PromptSafeProfile {
  return {
    headline: profile.headline.trim(),
    identity: {
      candidateToken: AI_CANDIDATE_TOKEN,
      city: profile.identity.city.trim(),
      firstName: profile.identity.firstName.trim(),
    },
    profileSections: profile.sections,
  };
}

/** Identifiers that stay local and are re-injected server-side after generation. */
export function buildLocalFields(profile: BaseProfile): CvLocalFields {
  return {
    email: profile.identity.email.trim(),
    github: profile.identity.github.trim(),
    lastName: profile.identity.lastName.trim(),
    linkedin: profile.identity.linkedIn.trim(),
    phone: profile.identity.phone.trim(),
  };
}
