export const supportedLocales = ["fr", "en"] as const;
export type Locale = "fr" | "en";

export const HEALTH_STATUS_OK = "ok" as const;
export const APPLICATION_STATUS_DRAFT = "draft" as const;

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

export interface DraftApplication {
  createdAt: string;
  id: string;
  offerUrl: string;
  offerTextPreview: string;
  status: typeof APPLICATION_STATUS_DRAFT;
  updatedAt: string;
  userEmail: string;
  extracted: ExtractedOfferFields;
}
