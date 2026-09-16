import type { CvGenerationRequest, ImportedCvProfilePatch } from "@cvforge/types"

export type ExperienceEntry = { company: string; period: string; results: string; role: string }
export type EducationEntry = {
  description: string
  degree: string
  honors: string
  institution: string
  year: string
}
export type CertificationEntry = { issuer: string; title: string; year: string }
export type ProjectEntry = { description: string; link: string; title: string }

export type BaseProfile = {
  headline: string
  id: string
  identity: {
    city: string
    email: string
    firstName: string
    github: string
    lastName: string
    linkedIn: string
    otherLink: string
    phone: string
    portfolio: string
  }
  label: string
  meta: {
    lastSavedAt: string | null
    maxProfiles: number | null
    source: "empty" | "onboarding" | "storage"
  }
  sections: {
    certifications: CertificationEntry[]
    education: EducationEntry[]
    experiences: ExperienceEntry[]
    interests: string
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
      email,
      firstName: "",
      github: "",
      lastName: "",
      linkedIn: "",
      otherLink: "",
      phone: "",
      portfolio: "",
    },
    label,
    meta: { lastSavedAt: null, maxProfiles: null, source: "empty" },
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

export const PROFILE_SECTION_COUNT = 5

/** Filled sections among those shown in the editor tabs (summary, experiences, education, projects, certifications). */
export function countCompletedSections(profile: BaseProfile) {
  const { sections } = profile
  return [
    sections.summary.trim() || sections.technicalSkills.length > 0,
    sections.experiences.length > 0,
    sections.education.length > 0,
    sections.personalProjects.length > 0,
    sections.certifications.length > 0,
  ].filter(Boolean).length
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
      email: profile.identity.email.trim(),
      github: profile.identity.github.trim(),
      lastName: profile.identity.lastName.trim(),
      linkedin: profile.identity.linkedIn.trim(),
      phone: profile.identity.phone.trim(),
    },
    promptProfile: {
      headline: profile.headline.trim(),
      identity: {
        candidateToken: "[CANDIDATE]",
        city: profile.identity.city.trim(),
        firstName: profile.identity.firstName.trim(),
      },
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
      firstName: identity.firstName.trim() || profile.identity.firstName,
      github: identity.github.trim() || profile.identity.github,
      linkedIn: identity.linkedIn.trim() || profile.identity.linkedIn,
      portfolio: identity.portfolio.trim() || profile.identity.portfolio,
    },
    sections: {
      certifications: pickList(sections.certifications, profile.sections.certifications),
      education: pickList(
        sections.education.map((item) => ({ ...item, description: item.description ?? "" })),
        profile.sections.education
      ),
      experiences: pickList(sections.experiences, profile.sections.experiences),
      interests: sections.interests.trim() || profile.sections.interests,
      personalProjects: pickList(sections.personalProjects, profile.sections.personalProjects),
      softSkills: pickList(sections.softSkills, profile.sections.softSkills),
      summary: sections.summary.trim() || profile.sections.summary,
      technicalSkills: pickList(sections.technicalSkills, profile.sections.technicalSkills),
    },
  }
}
