export type ProfileExperienceEntry = {
  company: string;
  period: string;
  results: string;
  role: string;
};

export type ProfileEducationEntry = {
  description: string;
  degree: string;
  honors: string;
  institution: string;
  year: string;
};

export type ProfileCertificationEntry = {
  issuer: string;
  title: string;
  year: string;
};

export type ProfilePreferences = {
  availabilityDate: string;
  availabilityMode: "immediate" | "date" | "";
  contractTypes: string;
};

export type ProfileLanguageEntry = {
  language: string;
  level: string;
};

export type ProfileProjectEntry = {
  description: string;
  link: string;
  title: string;
};

export type StoredProfile = {
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
  preferences: ProfilePreferences;
  sections: {
    certifications: ProfileCertificationEntry[];
    education: ProfileEducationEntry[];
    experiences: ProfileExperienceEntry[];
    interests: string;
    languages: ProfileLanguageEntry[];
    personalProjects: ProfileProjectEntry[];
    softSkills: string[];
    summary: string;
    technicalSkills: string[];
  };
};

export type StoredProfileRegistry = {
  activeProfileId: string;
  profiles: StoredProfile[];
  userEmail: string;
  version: 2;
};

/** DI token for the profiles store. */
export const PROFILES_STORE = Symbol("PROFILES_STORE");

export type ProfilesStore = {
  save(
    userEmail: string,
    registry: StoredProfileRegistry,
  ): Promise<StoredProfileRegistry>;
  findByUserEmail(userEmail: string): Promise<StoredProfileRegistry | null>;
  deleteByUserEmail(userEmail: string): Promise<number>;
};


