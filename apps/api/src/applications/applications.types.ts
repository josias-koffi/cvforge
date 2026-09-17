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
  interviewReports?: InterviewReport[];
  letterContent?: LetterDocumentContent | null;
  letterVersions?: LetterDocumentVersionEntry[];
  rawOfferText: string;
};

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
