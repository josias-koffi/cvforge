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

export function createEmptyProfile(email: string): BaseProfile {
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
    label: "Profil principal",
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

export function isProfileReady(profile: BaseProfile) {
  return Boolean(profile.identity.firstName.trim())
}

/** Personal identifiers stay local; only pseudonymised data reaches the prompt. */
export function buildGenerationRequest(profile: BaseProfile): CvGenerationRequest {
  return {
    localFields: {
      email: profile.identity.email.trim(),
      lastName: profile.identity.lastName.trim(),
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
