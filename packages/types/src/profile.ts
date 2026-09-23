export interface CvLocalFields {
  email: string;
  /** Re-injected locally like the other identifiers, never generated. */
  github?: string;
  lastName: string;
  linkedin?: string;
  phone: string;
}

export interface PromptSafeIdentity {
  candidateToken: string;
  city: string;
  firstName: string;
}

export interface PromptSafeProfileSections {
  certifications: Array<{ issuer: string; title: string; year: string }>;
  education: Array<{
    description?: string;
    degree: string;
    honors: string;
    institution: string;
    year: string;
  }>;
  experiences: Array<{
    company: string;
    period: string;
    results: string;
    role: string;
  }>;
  interests: string;
  languages: Array<{ language: string; level: string }>;
  personalProjects: Array<{ description: string; link: string; title: string }>;
  softSkills: string[];
  summary: string;
  technicalSkills: string[];
}

export type AvailabilityMode = "immediate" | "date" | "";

/**
 * What the candidate is looking for, as opposed to what they have done.
 *
 * Only reaches the cover letter: a CV states facts, a letter is where telling a
 * recruiter when you can start and on what contract belongs. Salary is
 * deliberately absent — French practice keeps it out of the letter.
 */
export interface ProfilePreferences {
  availabilityDate: string;
  availabilityMode: AvailabilityMode;
  contractTypes: string;
}

export interface PromptSafeProfile {
  headline: string;
  identity: PromptSafeIdentity;
  /** Absent on CV generation, which has no use for them. */
  preferences?: ProfilePreferences;
  profileSections: PromptSafeProfileSections;
}

export interface CvGenerationRequest {
  localFields: CvLocalFields;
  promptProfile: PromptSafeProfile;
  /**
   * Which profile the document is generated from. The server reads the search
   * project attached to it — the contracts the candidate is looking for — and
   * checks the profile belongs to the caller.
   */
  profileId?: string;
}

export interface LetterGenerationRequest extends CvGenerationRequest {
  refinement?: string;
}

export interface ImportedCvProfilePatch {
  headline: string;
  identity: {
    city: string;
    firstName: string;
    github: string;
    linkedIn: string;
    portfolio: string;
  };
  sections: PromptSafeProfileSections;
}

export interface ImportedCvExtractionResult {
  extractedProfile: ImportedCvProfilePatch;
  omittedFields: string[];
  qualityLimits: string[];
  source: {
    filename: string;
    mimeType: string;
    textLength: number;
  };
}
