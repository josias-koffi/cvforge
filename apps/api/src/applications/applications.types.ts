import type { AtsScoreResult } from "@cvforge/ats-score";
import type {
  ApplicationStatus,
  ApplicationsKpiSummary,
  CVDocumentContent,
  CVDocumentVersionEntry,
  DraftApplication,
  ExtractedOfferFields,
  InterviewReport,
  LetterDocumentContent,
  LetterDocumentVersionEntry,
} from "@cvforge/types";

export type StoredApplication = DraftApplication & {
  cvContent: CVDocumentContent | null;
  cvVersions?: CVDocumentVersionEntry[];
  /**
   * The score of the CV as it currently stands. Denormalised from the latest
   * version for the same reason `cvContent` is: the list screen reads it for
   * every row and never queries inside it (vision §7.1).
   */
  atsScore?: AtsScoreResult | null;
  interviewReports?: InterviewReport[];
  letterContent?: LetterDocumentContent | null;
  letterVersions?: LetterDocumentVersionEntry[];
  rawOfferText: string;
  /** What the offer asked and the CV did not show (US-127); pointers only. */
  skillsToHighlight?: string[];
};

/**
 * Source of an application created for a free tool's lead (US-136). Shown as
 * the source in the app, and what `/admin/metrics` counts the comparator's
 * activated accounts by.
 */
export const LEAD_OFFER_SOURCE_LABEL = "Comparateur gratuit CV / offre";

/** Same, for the likely interview questions tool's lead (US-141). */
export const LEAD_INTERVIEW_SOURCE_LABEL = "Questions d'entretien gratuites";

/** DI token for the applications store, shared by every module that reads them. */
export const APPLICATIONS_STORE = Symbol("APPLICATIONS_STORE");

export type ApplicationsStore = {
  createDraft: (application: StoredApplication) => Promise<StoredApplication>;
  findByIdForUserEmail: (
    userEmail: string,
    applicationId: string,
  ) => Promise<StoredApplication | null>;
  listAll: () => Promise<StoredApplication[]>;
  listByUserEmail: (userEmail: string) => Promise<StoredApplication[]>;
  save: (application: StoredApplication) => Promise<StoredApplication>;
  findById: (applicationId: string) => Promise<StoredApplication | null>;
  deleteByUserEmail: (userEmail: string) => Promise<number>;
};

export type OfferExtractionResult = {
  extracted: ExtractedOfferFields;
  offerText: string;
  offerTextPreview: string;
  offerUrl: string | null;
  sourceLabel: string;
  sourceType: DraftApplication["sourceType"];
};

export type ApplicationStatusUpdate = {
  applicationId: string;
  nextStatus: ApplicationStatus;
};

export type ApplicationSummary = ApplicationsKpiSummary;

export type OfferUpdateInput = {
  extracted?: Partial<ExtractedOfferFields>;
  offerText?: string;
  offerUrl?: string | null;
};
