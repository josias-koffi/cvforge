import type { Locale } from "./locale";

export * from "./documents";
export * from "./grounding";
export * from "./locale";
export * from "./profile";

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
/** Admin-only: the OpenRouter account balance fell under the alert threshold. */
export const NOTIFICATION_TYPE_OPENROUTER_LOW_BALANCE =
  "openrouter_low_balance" as const;

export const ADMIN_AUDIT_ACCOUNT_SUSPENDED = "account_suspended" as const;
export const ADMIN_AUDIT_ACCOUNT_REACTIVATED = "account_reactivated" as const;
export const ADMIN_AUDIT_ACCOUNT_DELETED = "account_deleted" as const;
export const ADMIN_AUDIT_ROLE_DEMOTED = "role_demoted" as const;
export const ADMIN_AUDIT_CREDITS_GRANTED = "credits_granted" as const;
export const ADMIN_AUDIT_SESSIONS_REVOKED = "sessions_revoked" as const;

export const adminAuditActions = [
  ADMIN_AUDIT_ACCOUNT_SUSPENDED,
  ADMIN_AUDIT_ACCOUNT_REACTIVATED,
  ADMIN_AUDIT_ACCOUNT_DELETED,
  ADMIN_AUDIT_ROLE_DEMOTED,
  ADMIN_AUDIT_CREDITS_GRANTED,
  ADMIN_AUDIT_SESSIONS_REVOKED,
] as const;
export type AdminAuditAction = (typeof adminAuditActions)[number];

/** One admin action on one account: who, when, what, on whom, and why. */
export interface AdminAuditEntry {
  id: string;
  actorEmail: string;
  action: AdminAuditAction;
  /** Null for an action that targets no single account. */
  targetEmail: string | null;
  note: string | null;
  metadata: { credits?: number; previousRole?: "admin" | "user" };
  createdAt: string;
}

/** An account kept out without losing its data. */
export const ACCOUNT_STATUS_ACTIVE = "active" as const;
export const ACCOUNT_STATUS_SUSPENDED = "suspended" as const;
export const accountStatuses = [
  ACCOUNT_STATUS_ACTIVE,
  ACCOUNT_STATUS_SUSPENDED,
] as const;
export type AccountStatus = (typeof accountStatuses)[number];

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
  NOTIFICATION_TYPE_OPENROUTER_LOW_BALANCE,
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
    offerId?: string;
    orderId?: string;
    packId?: string;
    stripeCheckoutSessionId?: string;
    stripePaymentIntentId?: string;
  };
}

/** @deprecated Legacy `apps/app` only; offers are managed by admins (`CreditOffer`). */
export interface CreditPackDefinition {
  credits: number;
  currency: "eur";
  id: CreditPackId;
  label: string;
  priceCents: number;
}

/** @deprecated Legacy `apps/app` only; offers are managed by admins (`CreditOffer`). */
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

export const CREDIT_OFFER_STATUS_DRAFT = "draft" as const;
export const CREDIT_OFFER_STATUS_ACTIVE = "active" as const;
export const CREDIT_OFFER_STATUS_ARCHIVED = "archived" as const;
export const creditOfferStatuses = [
  CREDIT_OFFER_STATUS_DRAFT,
  CREDIT_OFFER_STATUS_ACTIVE,
  CREDIT_OFFER_STATUS_ARCHIVED,
] as const;
export type CreditOfferStatus = (typeof creditOfferStatuses)[number];

/** Vision §11: no pack under 5 EUR (VAT included). */
export const CREDIT_OFFER_MIN_PRICE_CENTS = 500;

export interface LocalizedText {
  fr: string;
  en: string;
}

export interface LocalizedList {
  fr: string[];
  en: string[];
}

/** An offer as shown to visitors and buyers (landing, credits page). */
export interface PublicCreditOffer {
  id: string;
  slug: string;
  name: LocalizedText;
  description: LocalizedText;
  /** Marketing bullet points; they do not gate any feature. */
  features: LocalizedList;
  credits: number;
  priceCents: number;
  currency: "eur";
  isFeatured: boolean;
  sortOrder: number;
}

export interface AdminCreditOffer extends PublicCreditOffer {
  status: CreditOfferStatus;
  stripeProductId: string | null;
  stripePriceId: string | null;
  stripeSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreditOfferInput {
  slug: string;
  name: LocalizedText;
  description: LocalizedText;
  features: LocalizedList;
  credits: number;
  priceCents: number;
  status: CreditOfferStatus;
  sortOrder: number;
}

export interface AdminCreditOfferMutationResponse {
  offer: AdminCreditOffer;
  /** Set when the offer was saved but Stripe could not be updated. */
  stripeSyncError: string | null;
}

export const CREDIT_ORDER_STATUS_PENDING = "pending" as const;
export const CREDIT_ORDER_STATUS_PAID = "paid" as const;
export const CREDIT_ORDER_STATUS_FAILED = "failed" as const;
export const CREDIT_ORDER_STATUS_EXPIRED = "expired" as const;
export type CreditOrderStatus =
  | typeof CREDIT_ORDER_STATUS_PENDING
  | typeof CREDIT_ORDER_STATUS_PAID
  | typeof CREDIT_ORDER_STATUS_FAILED
  | typeof CREDIT_ORDER_STATUS_EXPIRED;

export interface CreditOrder {
  id: string;
  offerId: string;
  offerName: LocalizedText;
  credits: number;
  priceCents: number;
  currency: "eur";
  status: CreditOrderStatus;
  createdAt: string;
  paidAt: string | null;
}

export interface CreateCheckoutSessionRequest {
  offerId: string;
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
  /** Base profile picked for this application; null or absent means the default profile. */
  profileId?: string | null;
  sourceLabel: string;
  sourceType: typeof APPLICATION_SOURCE_URL | typeof APPLICATION_SOURCE_TEXT;
  status: ApplicationStatus;
  statusHistory: ApplicationStatusHistoryEntry[];
  updatedAt: string;
  userEmail: string;
  extracted: ExtractedOfferFields;
}


export interface TemplateLayoutItem {
  type: string;
  props: Record<string, unknown> & { id?: string };
  readOnly?: Record<string, boolean>;
}

export interface TemplateLayoutData {
  content: TemplateLayoutItem[];
  root: { props: Record<string, unknown>; readOnly?: Record<string, boolean> };
  zones?: Record<string, TemplateLayoutItem[]>;
}

export interface TemplateRecord {
  active: boolean;
  categories: string[];
  createdAt: string;
  id: string;
  isDefault: boolean;
  kind: TemplateKind;
  layout: TemplateLayoutData;
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
  layout?: TemplateLayoutData;
  locale?: Locale;
  name?: string;
};
