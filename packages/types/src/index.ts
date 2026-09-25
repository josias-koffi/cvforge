import type { Locale } from "./locale";

export * from "./departments";
export * from "./documents";
export * from "./grounding";
export * from "./acquisition";
export * from "./companies";
export * from "./company-check";
export * from "./company-pages";
export * from "./hiring-companies";
export * from "./lead";
export * from "./locale";
export * from "./market";
export * from "./match-score";
export * from "./profile";
export * from "./public-errors";
export * from "./rome";
export * from "./search-project";

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
/** No offer: a company La Bonne Boîte expects to hire (US-120). */
export const APPLICATION_SOURCE_SPONTANEOUS = "spontaneous" as const;
export const AI_CREDIT_ACTION_OFFER_ENRICHMENT = "offer_enrichment" as const;
export const AI_CREDIT_ACTION_CV_GENERATION = "cv_generation" as const;
export const AI_CREDIT_ACTION_LETTER_GENERATION = "letter_generation" as const;
export const AI_CREDIT_ACTION_CV_IMPORT = "cv_import" as const;
export const AI_CREDIT_ACTION_INTERVIEW_SESSION = "interview_session" as const;
/** The optional AI pass over a morning selection of job offers (E19). */
export const AI_CREDIT_ACTION_JOB_DIGEST_RERANK = "job_digest_rerank" as const;
export const CREDIT_EVENT_AI_USAGE = "ai_usage" as const;
export const CREDIT_EVENT_ADMIN_GRANT = "admin_grant" as const;
export const CREDIT_EVENT_STRIPE_PURCHASE = "stripe_purchase" as const;
export const CREDIT_EVENT_WELCOME_GRANT = "welcome_grant" as const;
export const NOTIFICATION_TYPE_APPLICATION_FOLLOW_UP =
  "application_follow_up" as const;
export const NOTIFICATION_TYPE_CREDIT_PURCHASE_CONFIRMED =
  "credit_purchase_confirmed" as const;
/** The morning selection of job offers is ready (E19). */
export const NOTIFICATION_TYPE_JOB_DIGEST = "job_digest" as const;
/** Admin-only: the OpenRouter account balance fell under the alert threshold. */
export const NOTIFICATION_TYPE_OPENROUTER_LOW_BALANCE =
  "openrouter_low_balance" as const;

export const ADMIN_AUDIT_ACCOUNT_SUSPENDED = "account_suspended" as const;
export const ADMIN_AUDIT_ACCOUNT_REACTIVATED = "account_reactivated" as const;
export const ADMIN_AUDIT_ACCOUNT_DELETED = "account_deleted" as const;
export const ADMIN_AUDIT_ROLE_DEMOTED = "role_demoted" as const;
export const ADMIN_AUDIT_CREDITS_GRANTED = "credits_granted" as const;
export const ADMIN_AUDIT_SESSIONS_REVOKED = "sessions_revoked" as const;
/** Publishing a legal document is an opposable decision; it is logged too. */
export const ADMIN_AUDIT_LEGAL_PUBLISHED = "legal_published" as const;

export const adminAuditActions = [
  ADMIN_AUDIT_ACCOUNT_SUSPENDED,
  ADMIN_AUDIT_ACCOUNT_REACTIVATED,
  ADMIN_AUDIT_ACCOUNT_DELETED,
  ADMIN_AUDIT_ROLE_DEMOTED,
  ADMIN_AUDIT_CREDITS_GRANTED,
  ADMIN_AUDIT_SESSIONS_REVOKED,
  ADMIN_AUDIT_LEGAL_PUBLISHED,
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
  metadata: {
    credits?: number;
    previousRole?: "admin" | "user";
    /** Which legal document was published, and at which version. */
    legalSlug?: LegalDocumentSlug;
    legalVersion?: number;
  };
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
  AI_CREDIT_ACTION_INTERVIEW_SESSION,
  AI_CREDIT_ACTION_JOB_DIGEST_RERANK,
] as const;
export type AiCreditAction = (typeof aiCreditActions)[number];
export const creditEventTypes = [
  CREDIT_EVENT_AI_USAGE,
  CREDIT_EVENT_ADMIN_GRANT,
  CREDIT_EVENT_STRIPE_PURCHASE,
  CREDIT_EVENT_WELCOME_GRANT,
] as const;
export type CreditEventType = (typeof creditEventTypes)[number];
export const notificationTypes = [
  NOTIFICATION_TYPE_APPLICATION_FOLLOW_UP,
  NOTIFICATION_TYPE_CREDIT_PURCHASE_CONFIRMED,
  NOTIFICATION_TYPE_JOB_DIGEST,
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
  /** Image tag actually serving the request; empty outside a deployment. */
  version: string;
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

/**
 * How long the interview should run. The agenda spreads its phases over this,
 * so it decides how much ground gets covered, not just when to stop.
 */
export const INTERVIEW_DURATION_CHOICES = [10, 20, 30] as const;
export type InterviewDurationMinutes =
  (typeof INTERVIEW_DURATION_CHOICES)[number];
/** Vision §10.5: a screening interview, and the shortest that covers everything. */
export const INTERVIEW_DEFAULT_DURATION_MINUTES: InterviewDurationMinutes = 10;

export function isInterviewDuration(
  value: unknown,
): value is InterviewDurationMinutes {
  return INTERVIEW_DURATION_CHOICES.some((choice) => choice === value);
}

export interface InterviewSessionStartRequest {
  applicationId?: string;
  language?: Locale;
  profile?: InterviewRecruiterProfile;
  durationMinutes?: number;
}

/** What an offer says about the company, beyond the role itself. */
export interface CompanyContext {
  sector: string | null;
  size: string | null;
  culture: string | null;
  values: string[];
  salaryEstimate: string | null;
}

/**
 * The job, the company and the candidate, frozen when the session opens.
 *
 * Frozen rather than read each turn for two reasons: a database round trip
 * does not belong on the critical path of a turn budgeted at a second, and an
 * offer edited mid-interview must not change the questions being asked.
 */
export interface InterviewContextSnapshot {
  offerTitle: string | null;
  companyName: string | null;
  offerSummary: string | null;
  /** A slice of the raw offer, which is where its own tone shows through. */
  offerExcerpt: string | null;
  requirements: string[];
  responsibilities: string[];
  company: CompanyContext | null;
  candidateHeadline: string | null;
  candidateSkills: string[];
  candidateExperiences: InterviewContextExperience[];
}

export interface InterviewContextExperience {
  role: string;
  company: string;
  period: string;
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
  /**
   * The answer as a complete audio file, base64.
   *
   * Empty when the studio streamed it up in pieces while it was being spoken
   * — see `InterviewAnswerPartRequest` — in which case the server assembles
   * what it buffered instead.
   */
  chunkBase64: string;
  chunkId: string;
  endedAt: string;
  format: string;
  isFinal: boolean;
  mimeType: string;
  sequence: number;
  startedAt: string;
}

/**
 * One piece of an answer, sent while the candidate is still talking.
 *
 * Raw PCM16, 16 kHz, mono, base64 — no container. A WAV cannot be cut into
 * readable pieces and neither can WebM, whose header only exists on the first
 * fragment; raw samples can be cut anywhere and joined back in order.
 */
export interface InterviewAnswerPartRequest {
  /** Raw little-endian 16-bit samples, base64. */
  audioBase64: string;
  /** The turn these pieces belong to, matching the eventual turn request. */
  chunkId: string;
  /** Position within the answer. Order of arrival is not guaranteed. */
  part: number;
}

export interface InterviewAnswerPartResponse {
  /** How many pieces of this answer the server is holding. */
  parts: number;
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
  durationMinutes: number;
  /**
   * When the candidate actually reached the studio, which is where the agenda
   * starts counting. Credits are spent at creation, sometimes minutes earlier,
   * and that gap must not eat into the interview.
   */
  startedAt: string | null;
  context: InterviewContextSnapshot | null;
}

/**
 * What the browser receives while one spoken turn plays out.
 *
 * The candidate's own transcription and the interviewer's reply are produced
 * by two calls running side by side, so `candidate` can arrive at any point
 * among the audio frames rather than strictly before them.
 */
export type InterviewTurnEvent =
  /** What the candidate said, once transcription lands. */
  | { type: "candidate"; text: string }
  /** Base64 PCM16 at 24 kHz, to be played in arrival order. */
  | { type: "audio"; data: string }
  /** What the interviewer is saying, as it is spoken. */
  | { type: "reply"; text: string }
  /**
   * End of turn. Carries when the interview actually began: the server stamps
   * it on the first spoken turn, long after the session was created, so it is
   * not in the summary the studio was opened with.
   */
  | {
      type: "done";
      startedAt?: string | null;
      /**
       * The interview is over: every phase has had its exchanges and the
       * recruiter has said goodbye. The studio scores it without waiting for
       * the clock to run out.
       */
      closed?: boolean;
    }
  | { type: "error"; message: string };

/**
 * One row of the session history. Deliberately carries neither `chunks` nor
 * `messages` nor `transcript`: a list of twenty sessions would otherwise drag
 * the whole `interview_chunks` table across the wire.
 */
export interface InterviewSessionListItem {
  applicationId: string | null;
  /** Title of the linked offer, when there is one; null in free-practice mode. */
  applicationTitle: string | null;
  completedAt: string | null;
  createdAt: string;
  id: string;
  language: Locale;
  /** Null until the session is finished and scored. */
  overallScore: number | null;
  profile: InterviewRecruiterProfile;
  responseCount: number;
  status: InterviewSessionStatus;
}

export interface InterviewMetricTrendPoint {
  completedAt: string;
  score: number;
}

export interface InterviewMetricTrend {
  key: InterviewReportMetricKey;
  label: string;
  /** Mean over the window, rounded to one decimal. */
  average: number;
  /** Last minus first in the window; 0 with a single session. */
  delta: number;
  points: InterviewMetricTrendPoint[];
}

/**
 * Aggregated over a candidate's recent finished sessions, so they can see
 * whether they are improving rather than only how the last one went.
 */
export interface InterviewProgressSummary {
  /** How many finished sessions the window covers. */
  sessionCount: number;
  overallScoreAverage: number | null;
  overallScoreDelta: number;
  overallScorePoints: InterviewMetricTrendPoint[];
  metrics: InterviewMetricTrend[];
  /** Consistently high metrics, best first; empty until there is evidence. */
  strengths: InterviewMetricTrend[];
  /** Consistently low metrics, worst first. */
  weaknesses: InterviewMetricTrend[];
}

/**
 * An interview is billed by the minute because its cost is: one speech call and
 * one transcription per answer, and a session fits roughly one answer per
 * three-quarters of a minute whatever its length. A flat fee would have made a
 * thirty-minute session cost what a ten-minute one does.
 *
 * Declared here rather than beside `INTERVIEW_DURATION_CHOICES` so that
 * `AI_CREDIT_COSTS` below can read it: a `const` stays in its temporal dead
 * zone until its own line runs, and the map would throw on import.
 */
export const CREDITS_PER_INTERVIEW_MINUTE = 1;

/** What a session of that length costs, charged when it is created. */
export function interviewSessionCost(minutes: InterviewDurationMinutes) {
  return CREDITS_PER_INTERVIEW_MINUTE * minutes;
}

export const AI_CREDIT_COSTS: Record<AiCreditAction, number> = {
  [AI_CREDIT_ACTION_CV_IMPORT]: 2,
  [AI_CREDIT_ACTION_OFFER_ENRICHMENT]: 1,
  [AI_CREDIT_ACTION_CV_GENERATION]: 3,
  [AI_CREDIT_ACTION_LETTER_GENERATION]: 3,
  // The default duration's price, which is what every surface showing a single
  // figure per action displays. A longer session costs `interviewSessionCost`.
  [AI_CREDIT_ACTION_INTERVIEW_SESSION]: interviewSessionCost(
    INTERVIEW_DEFAULT_DURATION_MINUTES,
  ),
  // One model call re-ranks a whole morning selection and writes a line per
  // offer. Charged once a day, to the candidates who asked for it — and only
  // when the call succeeds.
  [AI_CREDIT_ACTION_JOB_DIGEST_RERANK]: 1,
};

/**
 * One application = offer analysis + tailored CV + cover letter + a ten-minute
 * mock interview and its scored report. The interview is inside the count
 * because it is what the packs promise; someone who skips it gets more
 * applications than advertised, never fewer.
 */
export const CREDITS_PER_APPLICATION =
  AI_CREDIT_COSTS[AI_CREDIT_ACTION_OFFER_ENRICHMENT] +
  AI_CREDIT_COSTS[AI_CREDIT_ACTION_CV_GENERATION] +
  AI_CREDIT_COSTS[AI_CREDIT_ACTION_LETTER_GENERATION] +
  AI_CREDIT_COSTS[AI_CREDIT_ACTION_INTERVIEW_SESSION];

/** How many complete applications a credit amount pays for. */
export function estimateApplications(credits: number) {
  return Math.max(0, Math.floor(credits / CREDITS_PER_APPLICATION));
}

/**
 * Granted once on account creation: a CV import plus two complete applications,
 * interviews included — the mock interview is the thing to try before paying.
 */
export const WELCOME_CREDITS =
  AI_CREDIT_COSTS[AI_CREDIT_ACTION_CV_IMPORT] + 2 * CREDITS_PER_APPLICATION;
export const WELCOME_APPLICATIONS = estimateApplications(WELCOME_CREDITS);

export interface CreditLedgerEntry {
  id: string;
  userEmail: string;
  type: CreditEventType;
  action: AiCreditAction | "admin_grant" | "stripe_purchase" | "welcome_grant";
  amount: number;
  balanceAfter: number;
  createdAt: string;
  note: string | null;
  metadata: {
    adminEmail?: string;
    applicationId?: string;
    /** Interview sessions only: what the per-minute charge was computed from. */
    durationMinutes?: number;
    offerId?: string;
    orderId?: string;
    packId?: string;
    stripeCheckoutSessionId?: string;
    stripePaymentIntentId?: string;
  };
}

export const CREDIT_OFFER_STATUS_DRAFT = "draft" as const;
export const CREDIT_OFFER_STATUS_ACTIVE = "active" as const;
export const CREDIT_OFFER_STATUS_ARCHIVED = "archived" as const;
export const creditOfferStatuses = [
  CREDIT_OFFER_STATUS_DRAFT,
  CREDIT_OFFER_STATUS_ACTIVE,
  CREDIT_OFFER_STATUS_ARCHIVED,
] as const;
export type CreditOfferStatus = (typeof creditOfferStatuses)[number];

/** Vision §11: no pack under 5 EUR. */
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

/** What a user's own pages need: the balance, not the ledger behind it. */
export interface CreditBalanceSummary {
  userEmail: string;
  balance: number;
  lowBalanceThreshold: number;
  isLowBalance: boolean;
}

export interface CreditLedgerSummary extends CreditBalanceSummary {
  history: CreditLedgerEntry[];
}

/** Which way the credits moved: spent on the AI, or added by a grant or a purchase. */
export const creditHistoryKinds = ["spent", "earned"] as const;
export type CreditHistoryKind = (typeof creditHistoryKinds)[number];

/** One page of a user's ledger, newest first. */
export interface CreditHistoryPage {
  entries: CreditLedgerEntry[];
  filters: { kind: CreditHistoryKind | null };
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
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
    /** The day of the selection this notification announces. */
    digestDate?: string;
    matchCount?: number;
  };
}

export interface NotificationSummary {
  unreadCount: number;
}

export interface NotificationEmailPreferences {
  applicationFollowUp: boolean;
  creditPurchaseConfirmed: boolean;
  /** The morning e-mail of job offers. Off here means in-app only. */
  jobDigest: boolean;
}

export interface NotificationPreferences {
  email: NotificationEmailPreferences;
}

export interface NotificationPreferencesResponse {
  emailDeliveryReady: boolean;
  preferences: NotificationPreferences;
  provider: string | null;
}

/**
 * What a client can rely on about a CV's ATS score.
 *
 * Deliberately a subset of `AtsScoreResult` (@cvforge/ats-score) rather than a
 * re-export: that package already depends on this one, and importing it back
 * would close a cycle. The full result is what gets stored; this is what the
 * transport promises.
 */
export interface AtsScoreSummary {
  overallScore: number;
  band: "weak" | "fair" | "good" | "excellent";
  /** The scale that produced it — scores from two versions never share an average. */
  engineVersion: string;
}

/** One criterion of a CV's ATS score; a score is never shown when unavailable. */
export interface AtsScoreDimensionDetail {
  key: string;
  status: "scored" | "unavailable";
  score: number | null;
}

/** One point the engine raised, worded by its code on the client. */
export interface AtsScoreFindingDetail {
  code: string;
  severity: "critical" | "warning" | "info";
  dimension: string;
}

/**
 * The whole score of a generated CV, as an application carries it: the
 * engine's result without its internals, so the candidate can read what to
 * fix criterion by criterion (US-153).
 */
export interface AtsScoreDetail extends AtsScoreSummary {
  dimensions: AtsScoreDimensionDetail[];
  findings: AtsScoreFindingDetail[];
  /** The critical finding that held the score down, when one did. */
  cappedBy?: string;
}

export interface DraftApplication {
  createdAt: string;
  /** Absent or null when the CV has never been scored; never zero. */
  atsScore?: AtsScoreDetail | null;
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
  sourceType:
    | typeof APPLICATION_SOURCE_URL
    | typeof APPLICATION_SOURCE_TEXT
    | typeof APPLICATION_SOURCE_SPONTANEOUS;
  status: ApplicationStatus;
  statusHistory: ApplicationStatusHistoryEntry[];
  updatedAt: string;
  userEmail: string;
  extracted: ExtractedOfferFields;
  /**
   * What the offer says about the company itself, derived once and cached.
   * Absent until an interview asks for it — see ADR-016.
   */
  companyContext?: CompanyContext | null;
  companyContextGeneratedAt?: string | null;
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

/**
 * The four legal documents CVSpark publishes. The slug is the stable key:
 * the URL each locale serves them under is the landing's business, not this
 * contract's.
 */
export const LEGAL_DOCUMENT_TERMS = "terms" as const;
export const LEGAL_DOCUMENT_SALES_TERMS = "sales-terms" as const;
export const LEGAL_DOCUMENT_LEGAL_NOTICE = "legal-notice" as const;
export const LEGAL_DOCUMENT_PRIVACY = "privacy" as const;

export const legalDocumentSlugs = [
  LEGAL_DOCUMENT_TERMS,
  LEGAL_DOCUMENT_SALES_TERMS,
  LEGAL_DOCUMENT_LEGAL_NOTICE,
  LEGAL_DOCUMENT_PRIVACY,
] as const;
export type LegalDocumentSlug = (typeof legalDocumentSlugs)[number];

export function isLegalDocumentSlug(value: unknown): value is LegalDocumentSlug {
  return legalDocumentSlugs.some((slug) => slug === value);
}

/**
 * A published document, as the landing renders it. `body` is plain text in the
 * convention `parseLegalBody` reads: "## " opens a sub-heading, "- " a list
 * item, blank lines separate blocks. Never HTML — nothing renders it as markup.
 */
export interface PublicLegalDocument {
  slug: LegalDocumentSlug;
  title: LocalizedText;
  body: LocalizedText;
  version: number;
  publishedAt: string;
}

/** The same document in the back-office, where a draft has no publication. */
export interface AdminLegalDocument extends Omit<PublicLegalDocument, "publishedAt"> {
  id: string;
  /** Null while the document has never been published. */
  publishedAt: string | null;
  updatedAt: string;
}

export type LegalDocumentInput = {
  title: LocalizedText;
  body: LocalizedText;
};

/**
 * A legal document is plain text, and it is rendered as React elements — never
 * as HTML. That is the whole point of parsing it ourselves rather than pulling
 * in a markdown engine: a document edited from the back-office can never put
 * markup on the page.
 *
 * The convention, deliberately small:
 * - a line starting with "## " opens a sub-heading;
 * - a line starting with "- " is a list item;
 * - anything else is a paragraph, blocks being separated by blank lines.
 */
export type LegalBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }

const HEADING_PREFIX = "## "
const LIST_PREFIX = "- "

export function parseLegalBody(body: string): LegalBlock[] {
  const blocks: LegalBlock[] = []
  let paragraph: string[] = []
  let list: string[] = []

  const flush = () => {
    if (paragraph.length > 0) {
      blocks.push({ type: "paragraph", text: paragraph.join(" ") })
      paragraph = []
    }

    if (list.length > 0) {
      blocks.push({ type: "list", items: list })
      list = []
    }
  }

  for (const rawLine of body.split("\n")) {
    const line = rawLine.trim()

    if (!line) {
      flush()
      continue
    }

    if (line.startsWith(HEADING_PREFIX)) {
      flush()
      const text = line.slice(HEADING_PREFIX.length).trim()
      if (text) {
        blocks.push({ type: "heading", text })
      }
      continue
    }

    if (line.startsWith(LIST_PREFIX)) {
      if (paragraph.length > 0) {
        flush()
      }
      const item = line.slice(LIST_PREFIX.length).trim()
      if (item) {
        list.push(item)
      }
      continue
    }

    if (list.length > 0) {
      flush()
    }

    paragraph.push(line)
  }

  flush()

  return blocks
}
