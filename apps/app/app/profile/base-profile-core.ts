import { loadDraftFromStorage } from "../onboarding/draft";
import {
  normalizeEmail,
  normalizeLongText,
  normalizePhone,
  normalizeShortText,
  normalizeUrlField,
} from "../input-guards";
export type {
  BaseProfile,
  BaseProfileRegistry,
  CertificationEntry,
  EducationEntry,
  ExperienceEntry,
  ProjectEntry,
} from "./base-profile-types";
import type {
  BaseProfile,
  BaseProfileRegistry,
  CertificationEntry,
  EducationEntry,
  ExperienceEntry,
  ProjectEntry,
} from "./base-profile-types";

function createProfileId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `profile_${Date.now().toString(36)}`;
}

export function createProfileLabel(index: number) {
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
    description: "",
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

export function asExperienceList(value: unknown) {
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

export function asEducationList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => ({
    description: normalizeLongText(
      (item as EducationEntry | undefined)?.description,
      600,
    ),
    degree: normalizeShortText((item as EducationEntry | undefined)?.degree, 120),
    honors: normalizeShortText((item as EducationEntry | undefined)?.honors, 120),
    institution: normalizeShortText((item as EducationEntry | undefined)?.institution, 120),
    year: normalizeShortText((item as EducationEntry | undefined)?.year, 16),
  }));
}

export function asCertificationList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => ({
    issuer: normalizeShortText((item as CertificationEntry | undefined)?.issuer, 120),
    title: normalizeShortText((item as CertificationEntry | undefined)?.title, 120),
    year: normalizeShortText((item as CertificationEntry | undefined)?.year, 16),
  }));
}

export function asProjectList(value: unknown) {
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

export function normalizeStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeShortText(item, 80))
    .filter(Boolean);
}

export function hasMeaningfulProfileContent(profile: BaseProfile) {
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

export function touchBaseProfile(profile: BaseProfile): BaseProfile {
  return {
    ...profile,
    meta: {
      ...profile.meta,
      lastSavedAt: new Date().toISOString(),
    },
  };
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
