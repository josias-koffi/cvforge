export const supportedLocales = ["fr", "en"] as const;
export type Locale = "fr" | "en";

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

export interface DraftApplication {
  createdAt: string;
  id: string;
  offerUrl: string | null;
  offerTextPreview: string;
  sourceLabel: string;
  sourceType:
    | typeof APPLICATION_SOURCE_URL
    | typeof APPLICATION_SOURCE_TEXT;
  status: ApplicationStatus;
  statusHistory: ApplicationStatusHistoryEntry[];
  updatedAt: string;
  userEmail: string;
  extracted: ExtractedOfferFields;
}
