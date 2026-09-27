import { randomUUID } from "node:crypto";
import type { StoredProfile, StoredProfileRegistry } from "./profiles.types";

/**
 * A registry holding one blank profile, the one the app creates at
 * onboarding (`createEmptyProfile` in apps/web). The API writes it only when
 * something must hang off a profile before the candidate opened the app: a
 * search a free tool asked for (US-137).
 */
export function emptyProfileRegistry(
  userEmail: string,
  id: string = randomUUID(),
): StoredProfileRegistry {
  const profile: StoredProfile = {
    headline: "",
    id,
    identity: {
      city: "",
      email: userEmail,
      firstName: "",
      github: "",
      lastName: "",
      linkedIn: "",
      otherLink: "",
      phone: "",
      portfolio: "",
    },
    label: "Profil principal",
    meta: { lastSavedAt: null, maxProfiles: null, source: "empty" },
    preferences: { availabilityDate: "", availabilityMode: "", contractTypes: "" },
    sections: {
      certifications: [],
      education: [],
      experiences: [],
      interests: "",
      languages: [],
      personalProjects: [],
      softSkills: [],
      summary: "",
      technicalSkills: [],
    },
  };

  return { activeProfileId: id, profiles: [profile], userEmail, version: 2 };
}
