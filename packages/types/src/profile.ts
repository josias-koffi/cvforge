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

export interface PromptSafeProfile {
  headline: string;
  identity: PromptSafeIdentity;
  profileSections: PromptSafeProfileSections;
}

export interface CvGenerationRequest {
  localFields: CvLocalFields;
  promptProfile: PromptSafeProfile;
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
