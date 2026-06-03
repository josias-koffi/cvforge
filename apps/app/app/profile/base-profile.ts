import type { ImportedCvProfilePatch } from "@cvforge/types";
import {
  APPLICATION_PROFILE_SELECTION_STORAGE_KEY,
  BASE_PROFILE_REGISTRY_STORAGE_KEY,
  BASE_PROFILE_STORAGE_KEY,
  type ApplicationProfileSelection,
  type BaseProfile,
  type BaseProfileRegistry,
} from "./base-profile-types";
import {
  asCertificationList,
  asEducationList,
  asExperienceList,
  asProjectList,
  createEmptyBaseProfile,
  createEmptyProfileRegistry,
  createProfileFromOnboarding,
  createProfileLabel,
  hasMeaningfulProfileContent,
  normalizeStringList,
  sanitizeBaseProfile,
  touchBaseProfile,
} from "./base-profile-core";
import {
  normalizeLongText,
  normalizeShortText,
  normalizeUrlField,
} from "../input-guards";

export * from "./base-profile-core";
export * from "./base-profile-types";

function migrateLegacyProfile(
  sessionEmail: string,
  legacyValue: unknown,
): BaseProfileRegistry | null {
  if (!legacyValue || typeof legacyValue !== "object") {
    return null;
  }

  const migratedProfile = sanitizeBaseProfile(
    legacyValue,
    sessionEmail,
    createEmptyBaseProfile(sessionEmail),
  );

  return {
    activeProfileId: migratedProfile.id,
    profiles: [
      {
        ...migratedProfile,
        meta: {
          ...migratedProfile.meta,
          source: "storage",
        },
      },
    ],
    version: 2,
  };
}

export function sanitizeBaseProfileRegistry(
  value: unknown,
  sessionEmail: string,
): BaseProfileRegistry {
  const fallback = createEmptyProfileRegistry(sessionEmail);

  if (!value || typeof value !== "object") {
    return fallback;
  }

  const candidate = value as Partial<BaseProfileRegistry>;
  const rawProfiles = Array.isArray(candidate.profiles) ? candidate.profiles : [];
  const profiles = rawProfiles
    .map((profile, index) =>
      sanitizeBaseProfile(profile, sessionEmail, createEmptyBaseProfile(sessionEmail, {
        label: createProfileLabel(index + 1),
      })),
    )
    .filter((profile, index, collection) =>
      collection.findIndex((item) => item.id === profile.id) === index,
    );

  if (profiles.length === 0) {
    return fallback;
  }

  const activeProfileId = profiles.some((profile) => profile.id === candidate.activeProfileId)
    ? (candidate.activeProfileId as string)
    : profiles[0].id;

  return {
    activeProfileId,
    profiles,
    version: 2,
  };
}

export function getActiveProfile(registry: BaseProfileRegistry) {
  return (
    registry.profiles.find((profile) => profile.id === registry.activeProfileId) ??
    registry.profiles[0]
  );
}

export function loadProfileRegistryFromStorage(
  sessionEmail: string,
  storage: Pick<Storage, "getItem" | "setItem"> | undefined,
): BaseProfileRegistry {
  if (!storage) {
    return createEmptyProfileRegistry(sessionEmail);
  }

  const rawRegistry = storage.getItem(BASE_PROFILE_REGISTRY_STORAGE_KEY);

  if (rawRegistry) {
    try {
      return sanitizeBaseProfileRegistry(JSON.parse(rawRegistry) as unknown, sessionEmail);
    } catch {
      return createEmptyProfileRegistry(sessionEmail);
    }
  }

  const rawLegacyProfile = storage.getItem(BASE_PROFILE_STORAGE_KEY);

  if (rawLegacyProfile) {
    try {
      const migratedRegistry = migrateLegacyProfile(
        sessionEmail,
        JSON.parse(rawLegacyProfile) as unknown,
      );

      if (migratedRegistry) {
        storage.setItem(
          BASE_PROFILE_REGISTRY_STORAGE_KEY,
          JSON.stringify(migratedRegistry),
        );
        return migratedRegistry;
      }
    } catch {
      return createEmptyProfileRegistry(sessionEmail);
    }
  }

  const seededProfile = createProfileFromOnboarding(sessionEmail, storage);

  if (hasMeaningfulProfileContent(seededProfile)) {
    return {
      activeProfileId: seededProfile.id,
      profiles: [seededProfile],
      version: 2,
    };
  }

  return createEmptyProfileRegistry(sessionEmail);
}

export function saveProfileRegistryToStorage(
  registry: BaseProfileRegistry,
  storage: Pick<Storage, "setItem"> | undefined,
) {
  if (!storage) {
    return;
  }

  storage.setItem(BASE_PROFILE_REGISTRY_STORAGE_KEY, JSON.stringify(registry));
}

export function loadBaseProfileFromStorage(
  sessionEmail: string,
  storage: Pick<Storage, "getItem" | "setItem"> | undefined,
): BaseProfile {
  return getActiveProfile(loadProfileRegistryFromStorage(sessionEmail, storage));
}

export function saveBaseProfileToStorage(
  profile: BaseProfile,
  storage: Pick<Storage, "getItem" | "setItem"> | undefined,
) {
  if (!storage) {
    return;
  }

  const registry = loadProfileRegistryFromStorage(profile.identity.email, storage);
  const nextRegistry = {
    ...registry,
    activeProfileId: profile.id,
    profiles: registry.profiles.some((entry) => entry.id === profile.id)
      ? registry.profiles.map((entry) => (entry.id === profile.id ? profile : entry))
      : [...registry.profiles, profile],
  };

  saveProfileRegistryToStorage(nextRegistry, storage);
  storage.setItem(BASE_PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

export function clearBaseProfileFromStorage(
  storage: Pick<Storage, "removeItem"> | undefined,
) {
  if (!storage) {
    return;
  }

  storage.removeItem(BASE_PROFILE_STORAGE_KEY);
  storage.removeItem(BASE_PROFILE_REGISTRY_STORAGE_KEY);
  storage.removeItem(APPLICATION_PROFILE_SELECTION_STORAGE_KEY);
}

export function applyImportedCvProfilePatch(
  profile: BaseProfile,
  patch: ImportedCvProfilePatch,
): BaseProfile {
  return touchBaseProfile({
    ...profile,
    headline: normalizeShortText(patch.headline, 120) || profile.headline,
    identity: {
      ...profile.identity,
      city: normalizeShortText(patch.identity.city, 120) || profile.identity.city,
      firstName:
        normalizeShortText(patch.identity.firstName, 80) ||
        profile.identity.firstName,
      github: normalizeUrlField(patch.identity.github) || profile.identity.github,
      linkedIn:
        normalizeUrlField(patch.identity.linkedIn) || profile.identity.linkedIn,
      portfolio:
        normalizeUrlField(patch.identity.portfolio) || profile.identity.portfolio,
    },
    meta: {
      ...profile.meta,
      source: "storage",
    },
    sections: {
      certifications:
        asCertificationList(patch.sections.certifications).length > 0
          ? asCertificationList(patch.sections.certifications)
          : profile.sections.certifications,
      education:
        asEducationList(patch.sections.education).length > 0
          ? asEducationList(patch.sections.education)
          : profile.sections.education,
      experiences:
        asExperienceList(patch.sections.experiences).length > 0
          ? asExperienceList(patch.sections.experiences)
          : profile.sections.experiences,
      interests:
        normalizeLongText(patch.sections.interests, 400) ||
        profile.sections.interests,
      personalProjects:
        asProjectList(patch.sections.personalProjects).length > 0
          ? asProjectList(patch.sections.personalProjects)
          : profile.sections.personalProjects,
      softSkills:
        normalizeStringList(patch.sections.softSkills).length > 0
          ? normalizeStringList(patch.sections.softSkills)
          : profile.sections.softSkills,
      summary:
        normalizeLongText(patch.sections.summary) || profile.sections.summary,
      technicalSkills:
        normalizeStringList(patch.sections.technicalSkills).length > 0
          ? normalizeStringList(patch.sections.technicalSkills)
          : profile.sections.technicalSkills,
    },
  });
}

export function formatProfileSavedAt(value: string | null) {
  if (!value) {
    return "Aucune sauvegarde locale pour le profil.";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Profil enregistre localement.";
  }

  return `Profil enregistre le ${date.toLocaleString("fr-FR")}.`;
}

export function splitListInput(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function joinListInput(values: string[]) {
  return values.join(", ");
}

export function countCompletedProfileSections(profile: BaseProfile) {
  const sections = [
    profile.headline.trim(),
    profile.sections.summary.trim(),
    profile.sections.interests.trim(),
    profile.sections.experiences.length > 0 ? "experiences" : "",
    profile.sections.education.length > 0 ? "education" : "",
    profile.sections.technicalSkills.length > 0 ? "technical" : "",
    profile.sections.softSkills.length > 0 ? "soft" : "",
    profile.sections.certifications.length > 0 ? "certifications" : "",
    profile.sections.personalProjects.length > 0 ? "projects" : "",
  ];

  return sections.filter(Boolean).length;
}

export function loadApplicationProfileSelection(
  storage: Pick<Storage, "getItem"> | undefined,
): ApplicationProfileSelection {
  if (!storage) {
    return {};
  }

  const raw = storage.getItem(APPLICATION_PROFILE_SELECTION_STORAGE_KEY);

  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([applicationId, profileId]) =>
          typeof applicationId === "string" && typeof profileId === "string" && profileId.trim(),
      ),
    );
  } catch {
    return {};
  }
}

export function saveApplicationProfileSelection(
  selection: ApplicationProfileSelection,
  storage: Pick<Storage, "setItem"> | undefined,
) {
  if (!storage) {
    return;
  }

  storage.setItem(
    APPLICATION_PROFILE_SELECTION_STORAGE_KEY,
    JSON.stringify(selection),
  );
}

export function getSelectedProfileIdForApplication(
  applicationId: string,
  registry: BaseProfileRegistry,
  selection: ApplicationProfileSelection,
) {
  const selectedProfileId = selection[applicationId];

  if (selectedProfileId && registry.profiles.some((profile) => profile.id === selectedProfileId)) {
    return selectedProfileId;
  }

  return registry.activeProfileId;
}

export function getProfileForApplication(
  applicationId: string,
  registry: BaseProfileRegistry,
  selection: ApplicationProfileSelection,
) {
  const selectedProfileId = getSelectedProfileIdForApplication(
    applicationId,
    registry,
    selection,
  );

  return (
    registry.profiles.find((profile) => profile.id === selectedProfileId) ??
    getActiveProfile(registry)
  );
}
