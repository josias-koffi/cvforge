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
  description: string;
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
