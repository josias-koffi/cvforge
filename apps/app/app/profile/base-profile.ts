import { loadDraftFromStorage } from "../onboarding/draft";
import {
  normalizeEmail,
  normalizeLongText,
  normalizePhone,
  normalizeShortText,
  normalizeStringList,
  normalizeUrlField,
} from "../input-guards";

export const BASE_PROFILE_STORAGE_KEY = "cvforge-base-profile";

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
  meta: {
    lastSavedAt: string | null;
    maxProfiles: 1;
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

export function createEmptyBaseProfile(sessionEmail: string): BaseProfile {
  return {
    headline: "",
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
    meta: {
      lastSavedAt: null,
      maxProfiles: 1,
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
): BaseProfile {
  const draft = loadDraftFromStorage(sessionEmail, storage);

  return {
    headline: "",
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
    meta: {
      lastSavedAt: null,
      maxProfiles: 1,
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
): BaseProfile {
  const fallback = createEmptyBaseProfile(sessionEmail);

  if (!value || typeof value !== "object") {
    return fallback;
  }

  const candidate = value as Partial<BaseProfile>;

  return {
    headline: normalizeShortText(candidate.headline, 120),
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
    meta: {
      lastSavedAt:
        typeof candidate.meta?.lastSavedAt === "string"
          ? candidate.meta.lastSavedAt
          : null,
      maxProfiles: 1,
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

export function loadBaseProfileFromStorage(
  sessionEmail: string,
  storage: Pick<Storage, "getItem"> | undefined,
): BaseProfile {
  if (!storage) {
    return createEmptyBaseProfile(sessionEmail);
  }

  const rawProfile = storage.getItem(BASE_PROFILE_STORAGE_KEY);

  if (rawProfile) {
    try {
      const parsed = JSON.parse(rawProfile) as unknown;
      const sanitized = sanitizeBaseProfile(parsed, sessionEmail);

      return {
        ...sanitized,
        meta: {
          ...sanitized.meta,
          source: "storage",
        },
      };
    } catch {
      return createEmptyBaseProfile(sessionEmail);
    }
  }

  const seededProfile = createProfileFromOnboarding(sessionEmail, storage);
  const hasOnboardingData = Boolean(
    seededProfile.identity.firstName.trim() ||
      seededProfile.identity.lastName.trim() ||
      seededProfile.identity.city.trim() ||
      seededProfile.identity.phone.trim() ||
      seededProfile.identity.linkedIn.trim() ||
      seededProfile.identity.github.trim() ||
      seededProfile.identity.portfolio.trim() ||
      seededProfile.identity.otherLink.trim() ||
      seededProfile.sections.summary.trim(),
  );

  return hasOnboardingData ? seededProfile : createEmptyBaseProfile(sessionEmail);
}

export function saveBaseProfileToStorage(
  profile: BaseProfile,
  storage: Pick<Storage, "setItem"> | undefined,
) {
  if (!storage) {
    return;
  }

  storage.setItem(BASE_PROFILE_STORAGE_KEY, JSON.stringify(profile));
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
