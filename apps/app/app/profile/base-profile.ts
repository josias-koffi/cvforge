import type { ImportedCvProfilePatch } from "@cvforge/types";
import { loadDraftFromStorage } from "../onboarding/draft";
import {
  normalizeEmail,
  normalizeLongText,
  normalizePhone,
  normalizeShortText,
  normalizeUrlField,
} from "../input-guards";

export const BASE_PROFILE_STORAGE_KEY = "cvforge-base-profile";
export const BASE_PROFILE_REGISTRY_STORAGE_KEY = "cvforge-base-profiles";
export const APPLICATION_PROFILE_SELECTION_STORAGE_KEY =
  "cvforge-application-profile-selection";

export type ExperienceEntry = {
  company: string;
  period: string;
  results: string;
  role: string;
};

export type EducationEntry = {
  degree: string;
  honors: string;
  institution: string;
  year: string;
};

export type CertificationEntry = {
  issuer: string;
  title: string;
  year: string;
};

export type ProjectEntry = {
  description: string;
  link: string;
  title: string;
};

export type BaseProfile = {
  headline: string;
  id: string;
  identity: {
    city: string;
    email: string;
    firstName: string;
    github: string;
    lastName: string;
    linkedIn: string;
    otherLink: string;
    phone: string;
    portfolio: string;
  };
  label: string;
  meta: {
    lastSavedAt: string | null;
    maxProfiles: number | null;
    source: "empty" | "onboarding" | "storage";
  };
  sections: {
    certifications: CertificationEntry[];
    education: EducationEntry[];
    experiences: ExperienceEntry[];
    interests: string;
    personalProjects: ProjectEntry[];
    softSkills: string[];
    summary: string;
    technicalSkills: string[];
  };
};

export type BaseProfileRegistry = {
  activeProfileId: string;
  profiles: BaseProfile[];
  version: 2;
};

export type ApplicationProfileSelection = Record<string, string>;

function createProfileId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `profile_${Date.now().toString(36)}`;
}

function createProfileLabel(index: number) {
  return index === 1 ? "Profil principal" : `Profil ${index}`;
}

export function createEmptyExperience(): ExperienceEntry {
  return {
    company: "",
    period: "",
    results: "",
    role: "",
  };
}

export function createEmptyEducation(): EducationEntry {
  return {
    degree: "",
    honors: "",
    institution: "",
    year: "",
  };
}

export function createEmptyCertification(): CertificationEntry {
  return {
    issuer: "",
    title: "",
    year: "",
  };
}

export function createEmptyProject(): ProjectEntry {
  return {
    description: "",
    link: "",
    title: "",
  };
}

export function createEmptyBaseProfile(
  sessionEmail: string,
  options?: { id?: string; label?: string },
): BaseProfile {
  return {
    headline: "",
    id: normalizeShortText(options?.id, 80) || createProfileId(),
    identity: {
      city: "",
      email: sessionEmail,
      firstName: "",
      github: "",
      lastName: "",
      linkedIn: "",
      otherLink: "",
      phone: "",
      portfolio: "",
    },
    label: normalizeShortText(options?.label, 80) || createProfileLabel(1),
    meta: {
      lastSavedAt: null,
      maxProfiles: null,
      source: "empty",
    },
    sections: {
      certifications: [],
      education: [],
      experiences: [],
      interests: "",
      personalProjects: [],
      softSkills: [],
      summary: "",
      technicalSkills: [],
    },
  };
}

export function createEmptyProfileRegistry(sessionEmail: string): BaseProfileRegistry {
  const profile = createEmptyBaseProfile(sessionEmail);

  return {
    activeProfileId: profile.id,
    profiles: [profile],
    version: 2,
  };
}

export function createAdditionalBaseProfile(
  sessionEmail: string,
  profileCount: number,
): BaseProfile {
  return createEmptyBaseProfile(sessionEmail, {
    label: createProfileLabel(profileCount + 1),
  });
}

function asExperienceList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => ({
    company: normalizeShortText((item as ExperienceEntry | undefined)?.company, 120),
    period: normalizeShortText((item as ExperienceEntry | undefined)?.period, 80),
    results: normalizeLongText((item as ExperienceEntry | undefined)?.results, 600),
    role: normalizeShortText((item as ExperienceEntry | undefined)?.role, 120),
  }));
}

function asEducationList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => ({
    degree: normalizeShortText((item as EducationEntry | undefined)?.degree, 120),
    honors: normalizeShortText((item as EducationEntry | undefined)?.honors, 120),
    institution: normalizeShortText((item as EducationEntry | undefined)?.institution, 120),
    year: normalizeShortText((item as EducationEntry | undefined)?.year, 16),
  }));
}

function asCertificationList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => ({
    issuer: normalizeShortText((item as CertificationEntry | undefined)?.issuer, 120),
    title: normalizeShortText((item as CertificationEntry | undefined)?.title, 120),
    year: normalizeShortText((item as CertificationEntry | undefined)?.year, 16),
  }));
}

function asProjectList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => ({
    description: normalizeLongText((item as ProjectEntry | undefined)?.description, 600),
    link: normalizeUrlField((item as ProjectEntry | undefined)?.link),
    title: normalizeShortText((item as ProjectEntry | undefined)?.title, 120),
  }));
}

export function createProfileFromOnboarding(
  sessionEmail: string,
  storage: Pick<Storage, "getItem">,
  options?: { id?: string; label?: string },
): BaseProfile {
  const draft = loadDraftFromStorage(sessionEmail, storage);

  return {
    headline: "",
    id: normalizeShortText(options?.id, 80) || createProfileId(),
    identity: {
      city: draft.personal.city,
      email: draft.personal.professionalEmail || sessionEmail,
      firstName: draft.personal.firstName,
      github: draft.links.github,
      lastName: draft.personal.lastName,
      linkedIn: draft.links.linkedIn,
      otherLink: draft.links.other,
      phone: draft.personal.phone,
      portfolio: draft.links.portfolio,
    },
    label: normalizeShortText(options?.label, 80) || createProfileLabel(1),
    meta: {
      lastSavedAt: null,
      maxProfiles: null,
      source: "onboarding",
    },
    sections: {
      certifications: [],
      education: [],
      experiences: [],
      interests: "",
      personalProjects: [],
      softSkills: [],
      summary: draft.importCv.notes.trim(),
      technicalSkills: [],
    },
  };
}

export function sanitizeBaseProfile(
  value: unknown,
  sessionEmail: string,
  fallback?: BaseProfile,
): BaseProfile {
  const emptyProfile = fallback ?? createEmptyBaseProfile(sessionEmail);

  if (!value || typeof value !== "object") {
    return emptyProfile;
  }

  const candidate = value as Partial<BaseProfile>;

  return {
    headline: normalizeShortText(candidate.headline, 120),
    id: normalizeShortText(candidate.id, 80) || emptyProfile.id,
    identity: {
      city: normalizeShortText(candidate.identity?.city, 120),
      email: normalizeEmail(candidate.identity?.email, sessionEmail) || sessionEmail,
      firstName: normalizeShortText(candidate.identity?.firstName, 80),
      github: normalizeUrlField(candidate.identity?.github),
      lastName: normalizeShortText(candidate.identity?.lastName, 80),
      linkedIn: normalizeUrlField(candidate.identity?.linkedIn),
      otherLink: normalizeUrlField(candidate.identity?.otherLink),
      phone: normalizePhone(candidate.identity?.phone),
      portfolio: normalizeUrlField(candidate.identity?.portfolio),
    },
    label:
      normalizeShortText(candidate.label, 80) || emptyProfile.label || createProfileLabel(1),
    meta: {
      lastSavedAt:
        typeof candidate.meta?.lastSavedAt === "string"
          ? candidate.meta.lastSavedAt
          : null,
      maxProfiles: null,
      source:
        candidate.meta?.source === "onboarding" || candidate.meta?.source === "storage"
          ? candidate.meta.source
          : "empty",
    },
    sections: {
      certifications: asCertificationList(candidate.sections?.certifications),
      education: asEducationList(candidate.sections?.education),
      experiences: asExperienceList(candidate.sections?.experiences),
      interests: normalizeLongText(candidate.sections?.interests, 400),
      personalProjects: asProjectList(candidate.sections?.personalProjects),
      softSkills: normalizeStringList(candidate.sections?.softSkills),
      summary: normalizeLongText(candidate.sections?.summary),
      technicalSkills: normalizeStringList(candidate.sections?.technicalSkills),
    },
  };
}

function normalizeStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeShortText(item, 80))
    .filter(Boolean);
}

function hasMeaningfulProfileContent(profile: BaseProfile) {
  return Boolean(
    profile.identity.firstName.trim() ||
      profile.identity.lastName.trim() ||
      profile.identity.city.trim() ||
      profile.identity.phone.trim() ||
      profile.identity.linkedIn.trim() ||
      profile.identity.github.trim() ||
      profile.identity.portfolio.trim() ||
      profile.identity.otherLink.trim() ||
      profile.headline.trim() ||
      profile.sections.summary.trim(),
  );
}

function migrateLegacyProfile(
  sessionEmail: string,
  legacyValue: unknown,
): BaseProfileRegistry | null {
  if (!legacyValue || typeof legacyValue !== "object") {
    return null;
  }

  const migratedProfile = sanitizeBaseProfile(legacyValue, sessionEmail, createEmptyBaseProfile(sessionEmail));

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

export function touchBaseProfile(profile: BaseProfile): BaseProfile {
  return {
    ...profile,
    meta: {
      ...profile.meta,
      lastSavedAt: new Date().toISOString(),
    },
  };
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
