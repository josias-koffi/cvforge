export const supportedLocales = ["fr", "en"] as const;
export type Locale = "fr" | "en";
export const TEMPLATE_KIND_CV = "cv" as const;
export const TEMPLATE_KIND_LETTER = "letter" as const;
export const DIVIDER_STYLE_SOLID = "solid" as const;
export const DIVIDER_STYLE_SPACED = "spaced" as const;
export const SECTION_TITLE_STYLE_PLAIN = "plain" as const;
export const SECTION_TITLE_STYLE_ACCENT = "accent" as const;

export const HEALTH_STATUS_OK = "ok" as const;
export const APPLICATION_STATUS_DRAFT = "draft" as const;
export const APPLICATION_STATUS_SENT = "sent" as const;
export const APPLICATION_STATUS_INTERVIEW_SCHEDULED =
  "interview_scheduled" as const;
export const APPLICATION_STATUS_REJECTED = "rejected" as const;
export const APPLICATION_STATUS_OFFER_RECEIVED = "offer_received" as const;
export const APPLICATION_SOURCE_URL = "url" as const;
export const APPLICATION_SOURCE_TEXT = "text" as const;

export const applicationStatuses = [
  APPLICATION_STATUS_DRAFT,
  APPLICATION_STATUS_SENT,
  APPLICATION_STATUS_INTERVIEW_SCHEDULED,
  APPLICATION_STATUS_REJECTED,
  APPLICATION_STATUS_OFFER_RECEIVED,
] as const;

export type ApplicationStatus = (typeof applicationStatuses)[number];
export type TemplateKind =
  | typeof TEMPLATE_KIND_CV
  | typeof TEMPLATE_KIND_LETTER;
export type DividerStyle =
  | typeof DIVIDER_STYLE_SOLID
  | typeof DIVIDER_STYLE_SPACED;
export type SectionTitleStyle =
  | typeof SECTION_TITLE_STYLE_PLAIN
  | typeof SECTION_TITLE_STYLE_ACCENT;

export const applicationStatusTransitions = {
  [APPLICATION_STATUS_DRAFT]: [APPLICATION_STATUS_SENT],
  [APPLICATION_STATUS_SENT]: [
    APPLICATION_STATUS_INTERVIEW_SCHEDULED,
    APPLICATION_STATUS_REJECTED,
    APPLICATION_STATUS_OFFER_RECEIVED,
  ],
  [APPLICATION_STATUS_INTERVIEW_SCHEDULED]: [
    APPLICATION_STATUS_REJECTED,
    APPLICATION_STATUS_OFFER_RECEIVED,
  ],
  [APPLICATION_STATUS_REJECTED]: [],
  [APPLICATION_STATUS_OFFER_RECEIVED]: [],
} as const satisfies Record<ApplicationStatus, readonly ApplicationStatus[]>;

export interface ServiceHealth {
  status: "ok";
  service: string;
}

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
  degree: string;
  institution: string;
  mention: string;
  year: string;
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
  languages: LanguageItemProps[];
  projects: ProjectItemProps[];
  skills: {
    hard: string[];
    soft: string[];
  };
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
  object: string;
  signature: LMSignatureProps;
}

export interface ExtractedOfferFields {
  companyName: string | null;
  contractType: string | null;
  language: Locale;
  location: string | null;
  requirements: string[];
  responsibilities: string[];
  salaryRange: string | null;
  summary: string;
  title: string;
}

export interface ApplicationStatusHistoryEntry {
  changedAt: string;
  status: ApplicationStatus;
}

export interface ApplicationsKpiSummary {
  respondedCount: number;
  responseRate: number;
  statusCounts: Record<ApplicationStatus, number>;
  totalCount: number;
}

export interface DraftApplication {
  createdAt: string;
  cvGeneratedAt: string | null;
  id: string;
  offerUrl: string | null;
  offerTextPreview: string;
  sourceLabel: string;
  sourceType: typeof APPLICATION_SOURCE_URL | typeof APPLICATION_SOURCE_TEXT;
  status: ApplicationStatus;
  statusHistory: ApplicationStatusHistoryEntry[];
  updatedAt: string;
  userEmail: string;
  extracted: ExtractedOfferFields;
}

export interface CvLocalFields {
  email: string;
  lastName: string;
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

export interface TemplateLayoutBlock {
  id: string;
  name: string;
  props: Record<string, unknown>;
}

export interface TemplateLayout {
  blocks: TemplateLayoutBlock[];
}

export interface TemplateRecord {
  active: boolean;
  categories: string[];
  createdAt: string;
  id: string;
  isDefault: boolean;
  kind: TemplateKind;
  layout: TemplateLayout;
  locale: Locale;
  name: string;
  updatedAt: string;
}

export type TemplateUpsertInput = {
  active?: boolean;
  categories?: string[];
  isDefault?: boolean;
  kind?: TemplateKind;
  layout?: TemplateLayout;
  locale?: Locale;
  name?: string;
};
