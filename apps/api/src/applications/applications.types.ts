import type { DraftApplication, ExtractedOfferFields } from "@cvforge/types";

export type ApplicationsConfig = {
  stateFilePath: string;
};

export type StoredApplication = DraftApplication & {
  rawOfferText: string;
};

export type ApplicationsStore = {
  createDraft: (application: StoredApplication) => StoredApplication;
  listByUserEmail: (userEmail: string) => StoredApplication[];
};

export type OfferExtractionResult = {
  extracted: ExtractedOfferFields;
  offerText: string;
  offerTextPreview: string;
  offerUrl: string | null;
  sourceLabel: string;
  sourceType: DraftApplication["sourceType"];
};
