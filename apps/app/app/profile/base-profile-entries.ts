import {
  normalizeLongText,
  normalizeShortText,
  normalizeUrlField,
} from "../input-guards";
import type {
  CertificationEntry,
  EducationEntry,
  ExperienceEntry,
  LanguageEntry,
  ProfilePreferences,
  ProjectEntry,
} from "./base-profile-types";

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

const AVAILABILITY_MODES = new Set(["immediate", "date", ""]);

export function asPreferences(value: unknown): ProfilePreferences {
  const candidate = (value ?? {}) as Partial<ProfilePreferences>;
  const mode = candidate.availabilityMode;

  return {
    availabilityDate: normalizeShortText(candidate.availabilityDate, 40),
    availabilityMode:
      typeof mode === "string" && AVAILABILITY_MODES.has(mode)
        ? (mode as ProfilePreferences["availabilityMode"])
        : "",
    contractTypes: normalizeShortText(candidate.contractTypes, 120),
  };
}

export function createEmptyPreferences(): ProfilePreferences {
  return { availabilityDate: "", availabilityMode: "", contractTypes: "" };
}

export function asLanguageList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => ({
    language: normalizeShortText((item as LanguageEntry | undefined)?.language, 60),
    level: normalizeShortText((item as LanguageEntry | undefined)?.level, 60),
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
