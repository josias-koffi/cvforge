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
export const AI_CREDIT_ACTION_OFFER_ENRICHMENT = "offer_enrichment" as const;
export const AI_CREDIT_ACTION_CV_GENERATION = "cv_generation" as const;
export const AI_CREDIT_ACTION_LETTER_GENERATION = "letter_generation" as const;
export const AI_CREDIT_ACTION_CV_IMPORT = "cv_import" as const;
export const CREDIT_EVENT_AI_USAGE = "ai_usage" as const;
export const CREDIT_EVENT_ADMIN_GRANT = "admin_grant" as const;
export const CREDIT_EVENT_STRIPE_PURCHASE = "stripe_purchase" as const;
export const CREDIT_PACK_STARTER = "starter" as const;
export const CREDIT_PACK_PRO = "pro" as const;
export const NOTIFICATION_TYPE_APPLICATION_FOLLOW_UP =
  "application_follow_up" as const;
export const NOTIFICATION_TYPE_CREDIT_PURCHASE_CONFIRMED =
  "credit_purchase_confirmed" as const;

export const applicationStatuses = [
  APPLICATION_STATUS_DRAFT,
  APPLICATION_STATUS_SENT,
  APPLICATION_STATUS_INTERVIEW_SCHEDULED,
  APPLICATION_STATUS_REJECTED,
  APPLICATION_STATUS_OFFER_RECEIVED,
] as const;

export type ApplicationStatus = (typeof applicationStatuses)[number];
export const aiCreditActions = [
  AI_CREDIT_ACTION_OFFER_ENRICHMENT,
  AI_CREDIT_ACTION_CV_GENERATION,
  AI_CREDIT_ACTION_LETTER_GENERATION,
  AI_CREDIT_ACTION_CV_IMPORT,
] as const;
export type AiCreditAction = (typeof aiCreditActions)[number];
export const creditEventTypes = [
  CREDIT_EVENT_AI_USAGE,
  CREDIT_EVENT_ADMIN_GRANT,
  CREDIT_EVENT_STRIPE_PURCHASE,
] as const;
export type CreditEventType = (typeof creditEventTypes)[number];
export const creditPackIds = [CREDIT_PACK_STARTER, CREDIT_PACK_PRO] as const;
export type CreditPackId = (typeof creditPackIds)[number];
export const notificationTypes = [
  NOTIFICATION_TYPE_APPLICATION_FOLLOW_UP,
  NOTIFICATION_TYPE_CREDIT_PURCHASE_CONFIRMED,
] as const;
export type NotificationType = (typeof notificationTypes)[number];
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
  languages: LanguageItemProps[];
  projects: ProjectItemProps[];
  skills: {
    hard: string[];
    soft: string[];
    categories?: SkillCategory[];
  };
}

export type DocumentVersionSource = "generation" | "manual_save";

export interface CVDocumentVersionEntry {
  content: CVDocumentContent;
  createdAt: string;
  id: string;
  source: DocumentVersionSource;
  templateId: string | null;
  versionNumber: number;
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

export const INTERVIEW_CHUNK_STATUS_TRANSCRIBED = "transcribed" as const;
export const INTERVIEW_CHUNK_STATUS_FAILED = "failed" as const;
export const INTERVIEW_SESSION_STATUS_IDLE = "idle" as const;
export const INTERVIEW_SESSION_STATUS_RECORDING = "recording" as const;
export const INTERVIEW_SESSION_STATUS_READY = "ready" as const;
export const INTERVIEW_SESSION_STATUS_COMPLETED = "completed" as const;
export const INTERVIEW_SESSION_STATUS_ERROR = "error" as const;
export const INTERVIEW_PROFILE_STANDARD = "standard" as const;
export const INTERVIEW_PROFILE_AGGRESSIVE = "aggressive" as const;
export const INTERVIEW_PROFILE_PASSIVE = "passive" as const;
export const INTERVIEW_PROFILE_TECHNICAL = "technical" as const;
export const INTERVIEW_PROFILE_BEHAVIORAL = "behavioral" as const;

export const INTERVIEW_AI_STATUS_IDLE = "idle" as const;
export const INTERVIEW_AI_STATUS_GENERATING = "generating" as const;
export const INTERVIEW_AI_STATUS_DONE = "done" as const;
export const INTERVIEW_AI_STATUS_ERROR = "error" as const;

export const interviewRecruiterProfiles = [
  INTERVIEW_PROFILE_STANDARD,
  INTERVIEW_PROFILE_AGGRESSIVE,
  INTERVIEW_PROFILE_PASSIVE,
  INTERVIEW_PROFILE_TECHNICAL,
  INTERVIEW_PROFILE_BEHAVIORAL,
] as const;

export type InterviewChunkStatus =
  | typeof INTERVIEW_CHUNK_STATUS_TRANSCRIBED
  | typeof INTERVIEW_CHUNK_STATUS_FAILED;

export type InterviewSessionStatus =
  | typeof INTERVIEW_SESSION_STATUS_IDLE
  | typeof INTERVIEW_SESSION_STATUS_RECORDING
  | typeof INTERVIEW_SESSION_STATUS_READY
  | typeof INTERVIEW_SESSION_STATUS_COMPLETED
  | typeof INTERVIEW_SESSION_STATUS_ERROR;

export type InterviewRecruiterProfile =
  (typeof interviewRecruiterProfiles)[number];

export type InterviewAIStatus =
  | typeof INTERVIEW_AI_STATUS_IDLE
  | typeof INTERVIEW_AI_STATUS_GENERATING
  | typeof INTERVIEW_AI_STATUS_DONE
  | typeof INTERVIEW_AI_STATUS_ERROR;

export interface InterviewAIResponseEvent {
  type: "chunk" | "done" | "error";
  text?: string;
  index?: number;
  fullText?: string;
  message?: string;
  timestamp: string;
}

export interface InterviewSessionStartRequest {
  applicationId?: string;
  language?: Locale;
  profile?: InterviewRecruiterProfile;
}

export type InterviewReportMetricKey =
  | "clarity"
  | "keywords"
  | "pacing"
  | "hesitations"
  | "relevance";

export interface InterviewReportMetric {
  detail: string;
  key: InterviewReportMetricKey;
  label: string;
  score: number;
}

export interface InterviewTranscriptStats {
  averageResponseDurationSeconds: number | null;
  hesitationCount: number;
  keywordCoverage: number;
  keywordMentions: string[];
  responseCount: number;
}

export interface InterviewReport {
  createdAt: string;
  improvements: string[];
  metrics: InterviewReportMetric[];
  overallScore: number;
  summary: string;
  transcriptStats: InterviewTranscriptStats;
}

export interface InterviewSessionStartResponse {
  sessionId: string;
  session: InterviewSessionSummary;
}

export interface InterviewTranscriptionChunkRequest {
  chunkBase64: string;
  chunkId: string;
  endedAt: string;
  format: string;
  isFinal: boolean;
  mimeType: string;
  sequence: number;
  startedAt: string;
}

export interface InterviewTranscriptChunk {
  chunkId: string;
  createdAt: string;
  endedAt: string;
  errorMessage: string | null;
  isFinal: boolean;
  mimeType: string;
  sequence: number;
  startedAt: string;
  status: InterviewChunkStatus;
  transcript: string;
}

export interface InterviewMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface InterviewSessionSummary {
  applicationId: string | null;
  aiResponse: string | null;
  aiResponseGeneratedAt: string | null;
  aiStatus: InterviewAIStatus;
  chunks: InterviewTranscriptChunk[];
  completedAt: string | null;
  createdAt: string;
  id: string;
  language: Locale;
  lastError: string | null;
  messages: InterviewMessage[];
  prefetchedQuestion: string | null;
  profile: InterviewRecruiterProfile;
  report: InterviewReport | null;
  recoverable: boolean;
  status: InterviewSessionStatus;
  transcript: string;
  updatedAt: string;
}

export const AI_CREDIT_COSTS: Record<AiCreditAction, number> = {
  [AI_CREDIT_ACTION_CV_IMPORT]: 2,
  [AI_CREDIT_ACTION_OFFER_ENRICHMENT]: 1,
  [AI_CREDIT_ACTION_CV_GENERATION]: 3,
  [AI_CREDIT_ACTION_LETTER_GENERATION]: 3,
};

export interface CreditLedgerEntry {
  id: string;
  userEmail: string;
  type: CreditEventType;
  action: AiCreditAction | "admin_grant" | "stripe_purchase";
  amount: number;
  balanceAfter: number;
  createdAt: string;
  note: string | null;
  metadata: {
    adminEmail?: string;
    applicationId?: string;
    packId?: string;
    stripeCheckoutSessionId?: string;
    stripePaymentIntentId?: string;
  };
}

export interface CreditPackDefinition {
  credits: number;
  currency: "eur";
  id: CreditPackId;
  label: string;
  priceCents: number;
}

export const creditPacks: Record<CreditPackId, CreditPackDefinition> = {
  [CREDIT_PACK_STARTER]: {
    credits: 550,
    currency: "eur",
    id: CREDIT_PACK_STARTER,
    label: "Starter",
    priceCents: 999,
  },
  [CREDIT_PACK_PRO]: {
    credits: 1400,
    currency: "eur",
    id: CREDIT_PACK_PRO,
    label: "Pro",
    priceCents: 1999,
  },
};

export interface CreateCheckoutSessionRequest {
  packId: CreditPackId;
}

export interface CreateCheckoutSessionResponse {
  checkoutUrl: string;
  sessionId: string;
}

export interface CreditLedgerSummary {
  userEmail: string;
  balance: number;
  lowBalanceThreshold: number;
  isLowBalance: boolean;
  history: CreditLedgerEntry[];
}

export interface InAppNotification {
  id: string;
  userEmail: string;
  type: NotificationType;
  title: string;
  message: string;
  linkHref: string;
  createdAt: string;
  readAt: string | null;
  metadata: {
    applicationId?: string;
    packId?: string;
  };
}

export interface NotificationSummary {
  unreadCount: number;
}

export interface NotificationEmailPreferences {
  applicationFollowUp: boolean;
  creditPurchaseConfirmed: boolean;
}

export interface NotificationPreferences {
  email: NotificationEmailPreferences;
}

export interface NotificationPreferencesResponse {
  emailDeliveryReady: boolean;
  preferences: NotificationPreferences;
  provider: string | null;
}

export interface DraftApplication {
  createdAt: string;
  cvGeneratedAt: string | null;
  cvTemplateId?: string | null;
  id: string;
  interviewReports?: InterviewReport[];
  letterGeneratedAt?: string | null;
  letterTemplateId?: string | null;
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

export interface PuckDataItem {
  type: string;
  props: Record<string, unknown> & { id?: string };
  readOnly?: Record<string, boolean>;
}

export interface PuckData {
  content: PuckDataItem[];
  root: { props: Record<string, unknown>; readOnly?: Record<string, boolean> };
  zones?: Record<string, PuckDataItem[]>;
}

export interface TemplateRecord {
  active: boolean;
  categories: string[];
  createdAt: string;
  id: string;
  isDefault: boolean;
  kind: TemplateKind;
  layout: PuckData;
  locale: Locale;
  name: string;
  updatedAt: string;
}

export interface TemplateUsageMetric {
  active: boolean;
  id: string;
  isDefault: boolean;
  kind: TemplateKind;
  lastUsedAt: string | null;
  locale: Locale;
  name: string;
  usageCount: number;
}

export interface TemplateAnalyticsSummary {
  activeTemplates: number;
  defaultTemplates: number;
  generatedCvCount: number;
  generatedLetterCount: number;
  templatesByKind: Record<TemplateKind, number>;
  topTemplates: TemplateUsageMetric[];
  totalTemplates: number;
}

export type TemplateUpsertInput = {
  active?: boolean;
  categories?: string[];
  isDefault?: boolean;
  kind?: TemplateKind;
  layout?: PuckData;
  locale?: Locale;
  name?: string;
};
