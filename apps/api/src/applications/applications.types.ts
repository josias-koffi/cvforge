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

export type ApplicationsConfig = {
  stateFilePath: string;
};

export type StoredApplication = DraftApplication & {
  cvContent: CVDocumentContent | null;
  cvVersions?: CVDocumentVersionEntry[];
  interviewReports?: InterviewReport[];
  letterContent?: LetterDocumentContent | null;
  letterVersions?: LetterDocumentVersionEntry[];
  rawOfferText: string;
};

export type ApplicationsStore = {
  createDraft: (application: StoredApplication) => StoredApplication;
  findByIdForUserEmail: (
    userEmail: string,
    applicationId: string,
  ) => StoredApplication | null;
  listAll: () => StoredApplication[];
  listByUserEmail: (userEmail: string) => StoredApplication[];
  save: (application: StoredApplication) => StoredApplication;
  findById: (applicationId: string) => StoredApplication | null;
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
