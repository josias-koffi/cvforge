import type { ContactLink, CvGenerationRequest, ImportedCvProfilePatch } from "@cvforge/types"

export type ExperienceEntry = { company: string; period: string; results: string; role: string }
export type EducationEntry = {
  description: string
  degree: string
  honors: string
  institution: string
  year: string
}
export type CertificationEntry = { issuer: string; title: string; year: string }
export type LanguageEntry = { language: string; level: string }
export type ProfilePreferences = {
  availabilityDate: string
  availabilityMode: "immediate" | "date" | ""
  contractTypes: string
}
export type ProjectEntry = { description: string; link: string; title: string }

export type BaseProfile = {
  headline: string
  id: string
  identity: {
    city: string
    drivingLicenses: string[]
    email: string
    firstName: string
    lastName: string
    links: ContactLink[]
    phone: string
  }
  label: string
  meta: {
    lastSavedAt: string | null
    maxProfiles: number | null
    source: "empty" | "onboarding" | "storage"
  }
  preferences: ProfilePreferences
  sections: {
    certifications: CertificationEntry[]
    education: EducationEntry[]
    experiences: ExperienceEntry[]
    interests: string
    languages: LanguageEntry[]
    personalProjects: ProjectEntry[]
    softSkills: string[]
    summary: string
    technicalSkills: string[]
  }
}

export type ProfileRegistry = {
  activeProfileId: string
  profiles: BaseProfile[]
  version: 2
}

export function createEmptyProfile(email: string, label = "Profil principal"): BaseProfile {
  return {
    headline: "",
    id: crypto.randomUUID(),
    identity: {
      city: "",
      drivingLicenses: [],
      email,
      firstName: "",
      lastName: "",
      links: [],
      phone: "",
    },
    label,
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
  }
}

/** The requested profile, else the default (active) one, else the first. */
export function pickProfile(registry: ProfileRegistry, id?: string) {
  return (
    registry.profiles.find((item) => item.id === id) ??
    registry.profiles.find((item) => item.id === registry.activeProfileId) ??
    registry.profiles[0]
  )
}

export function duplicateBaseProfile(profile: BaseProfile): BaseProfile {
  return {
    ...structuredClone(profile),
    id: crypto.randomUUID(),
    label: `${profile.label} (copie)`,
    meta: { ...profile.meta, lastSavedAt: null },
  }
}

export function candidateName(profile: BaseProfile) {
  return [profile.identity.firstName, profile.identity.lastName].filter(Boolean).join(" ")
}

/**
 * A first name alone is not enough to generate from: without a single
 * experience or skill the model has nothing but the job offer to work from,
 * and invents the whole document.
 */
export function isProfileReady(profile: BaseProfile) {
  const { experiences, technicalSkills, softSkills } = profile.sections
  return Boolean(
    profile.identity.firstName.trim() &&
      (experiences.length > 0 || technicalSkills.length > 0 || softSkills.length > 0)
  )
}

/** Personal identifiers stay local; only pseudonymised data reaches the prompt. */
export function buildGenerationRequest(profile: BaseProfile): CvGenerationRequest {
  return {
    localFields: {
      drivingLicenses: profile.identity.drivingLicenses,
      email: profile.identity.email.trim(),
      lastName: profile.identity.lastName.trim(),
      links: profile.identity.links
        .map((link) => ({ label: link.label.trim(), url: link.url.trim() }))
        .filter((link) => link.label && link.url),
      phone: profile.identity.phone.trim(),
    },
    promptProfile: {
      headline: profile.headline.trim(),
      identity: {
        candidateToken: "[CANDIDATE]",
        city: profile.identity.city.trim(),
        firstName: profile.identity.firstName.trim(),
      },
      preferences: profile.preferences,
      profileSections: profile.sections,
    },
  }
}

function pickList<T>(incoming: T[] | undefined, current: T[]) {
  return incoming && incoming.length > 0 ? incoming : current
}

/** Merges data extracted from an uploaded CV, keeping existing values when the import is empty. */
export function applyImportedCv(
  profile: BaseProfile,
  patch: ImportedCvProfilePatch
): BaseProfile {
  const { identity, sections } = patch

  return {
    ...profile,
    headline: patch.headline.trim() || profile.headline,
    identity: {
      ...profile.identity,
      city: identity.city.trim() || profile.identity.city,
      drivingLicenses: pickList(identity.drivingLicenses, profile.identity.drivingLicenses),
      firstName: identity.firstName.trim() || profile.identity.firstName,
      links: pickList(identity.links, profile.identity.links),
    },
    sections: {
      certifications: pickList(sections.certifications, profile.sections.certifications),
      education: pickList(
        sections.education.map((item) => ({ ...item, description: item.description ?? "" })),
        profile.sections.education
      ),
      experiences: pickList(sections.experiences, profile.sections.experiences),
      interests: sections.interests.trim() || profile.sections.interests,
      languages: pickList(sections.languages, profile.sections.languages),
      personalProjects: pickList(sections.personalProjects, profile.sections.personalProjects),
      softSkills: pickList(sections.softSkills, profile.sections.softSkills),
      summary: sections.summary.trim() || profile.sections.summary,
      technicalSkills: pickList(sections.technicalSkills, profile.sections.technicalSkills),
    },
  }
}
