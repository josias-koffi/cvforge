import type { GroundingReport } from "./grounding";
import type { DividerStyle, SectionTitleStyle } from "./index";
import type { Locale } from "./locale";

export interface CandidateIdentity {
  city: string;
  email: string;
  firstName: string;
  github: string;
  lastName: string;
  linkedin: string;
  phone: string;
  title: string;
}

export type CVHeaderProps = CandidateIdentity;

export interface SummaryBlockProps {
  summary: string;
}

export interface ExperienceItemProps {
  achievements: string[];
  company: string;
  description: string;
  endDate: string;
  position: string;
  startDate: string;
}

export interface EducationItemProps {
  description: string;
  degree: string;
  institution: string;
  mention: string;
  year: string;
}

export interface SkillCategory {
  label: string;
  items: string[];
}

export interface SkillsListProps {
  hardSkills: string[];
  softSkills: string[];
}

export interface CertificationItemProps {
  issuer: string;
  title: string;
  year: string;
}

export interface LanguageItemProps {
  language: string;
  level: string;
}

export interface ProjectItemProps {
  description: string;
  title: string;
  url: string;
}

export interface LMHeaderProps extends CandidateIdentity {
  companyCity: string;
  companyName: string;
  date: string;
  object: string;
}

export interface LMBodyProps {
  paragraph1: string;
  paragraph2: string;
  paragraph3: string;
  paragraph4?: string;
}

export interface LMSignatureProps {
  firstName: string;
  lastName: string;
}

export interface DividerProps {
  style: DividerStyle;
}

export interface SectionTitleProps {
  label: string;
  style: SectionTitleStyle;
}

export interface CVDocumentContent {
  candidate: CandidateIdentity & SummaryBlockProps;
  certifications: CertificationItemProps[];
  education: EducationItemProps[];
  experiences: ExperienceItemProps[];
  /** What the server removed for lack of profile backing; absent once acknowledged. */
  grounding?: GroundingReport;
  interests: string;
  /** Language the document is written in; absent on legacy documents (French). */
  language?: Locale;
  languages: LanguageItemProps[];
  projects: ProjectItemProps[];
  skills: {
    hard: string[];
    soft: string[];
    categories?: SkillCategory[];
  };
}

export type DocumentVersionSource = "generation" | "manual_save" | "translation";

export interface DocumentTranslationRequest {
  targetLanguage: Locale;
}

export interface CVDocumentVersionEntry {
  content: CVDocumentContent;
  createdAt: string;
  id: string;
  source: DocumentVersionSource;
  templateId: string | null;
  versionNumber: number;
  /** ATS score of this version; absent on versions predating the feature. */
  atsScore?: number;
  /** The scale that produced it — scores from two versions never share an average. */
  atsEngineVersion?: string;
}

export interface CvContentUpdateRequest {
  cvContent: CVDocumentContent;
}

export interface LetterDocumentContent {
  body: LMBodyProps;
  candidate: CandidateIdentity;
  company: {
    city: string;
    name: string;
  };
  date: string;
  /** Language the document is written in; absent on legacy documents (French). */
  language?: Locale;
  object: string;
  signature: LMSignatureProps;
}

export interface LetterDocumentVersionEntry {
  content: LetterDocumentContent;
  createdAt: string;
  id: string;
  source: DocumentVersionSource;
  templateId: string | null;
  versionNumber: number;
}

export interface LetterContentUpdateRequest {
  letterContent: LetterDocumentContent;
}
