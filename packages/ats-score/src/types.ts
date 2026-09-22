/**
 * The vocabulary of the ATS engine.
 *
 * Nothing here knows where a CV came from. The landing scans an uploaded file,
 * the app scores a generated `CVDocumentContent`, and both are normalised into
 * the same `AtsDocument` before scoring — that is what keeps a single score on
 * a single scale across two very different surfaces.
 */

/**
 * 1.1.0 — critical findings now cap the overall score (see `CRITICAL_CAPS`).
 * Scores from 1.0.0 are not comparable with these: group by version before
 * averaging or charting anything.
 */
export const ATS_SCORE_ENGINE_VERSION = "1.1.0";

export const ATS_DIMENSION_KEYS = [
  "machineReadability",
  "structure",
  "keywords",
  "impact",
  "contactability",
  "formatHygiene",
] as const;

export type AtsDimensionKey = (typeof ATS_DIMENSION_KEYS)[number];

/**
 * `unavailable` is not a bad score, it is the absence of one: the landing has
 * no job offer to match against, so `keywords` cannot be observed there. Such a
 * dimension is dropped from the weighted mean rather than counted as zero,
 * which would punish a CV for a question nobody asked it.
 */
export type AtsDimensionStatus = "scored" | "unavailable";

export type AtsDimension = {
  key: AtsDimensionKey;
  status: AtsDimensionStatus;
  /** 0-100 when scored, null when unavailable. */
  score: number | null;
  /** Why it could not be scored — shown to the user as an unlock hint. */
  unavailableReason?: AtsUnavailableReason;
};

export type AtsUnavailableReason =
  | "NO_OFFER"
  | "NO_FILE_SIGNALS"
  /**
   * Nothing could be read from the file, so nothing about its contents can be
   * judged. Distinct from a CV that genuinely lacks a section.
   */
  | "NO_TEXT_LAYER";

/**
 * Findings are codes, never sentences. Wording lives in the landing
 * dictionaries and in apps/web, so the engine stays pure and the "no hardcoded
 * copy" rule of the landing holds without effort.
 */
export const ATS_FINDING_CODES = [
  "NO_TEXT_LAYER",
  "MULTI_COLUMN_LAYOUT",
  "TOO_MANY_PAGES",
  "GARBLED_CHARACTERS",
  "MISSING_EXPERIENCE_SECTION",
  "MISSING_EDUCATION_SECTION",
  "MISSING_SKILLS_SECTION",
  "MISSING_SUMMARY_SECTION",
  "MISSING_EMAIL",
  "MISSING_PHONE",
  "MISSING_LINKEDIN",
  "MISSING_CITY",
  "UNPARSABLE_DATES",
  "INCONSISTENT_DATE_FORMATS",
  "FEW_BULLETS",
  "TOO_SHORT",
  "TOO_LONG",
  "TABLE_MARKERS",
  "LOW_KEYWORD_COVERAGE",
  "KEYWORD_STUFFING",
  "MISSING_ACTION_VERBS",
  "MISSING_QUANTIFICATION",
  "UNSUPPORTED_SKILLS",
] as const;

export type AtsFindingCode = (typeof ATS_FINDING_CODES)[number];

export type AtsFindingSeverity = "critical" | "warning" | "info";

export type AtsFinding = {
  code: AtsFindingCode;
  severity: AtsFindingSeverity;
  dimension: AtsDimensionKey;
};

export type AtsScoreBand = "weak" | "fair" | "good" | "excellent";

export type AtsSectionPresence = {
  summary: boolean;
  experience: boolean;
  education: boolean;
  skills: boolean;
  languages: boolean;
  certifications: boolean;
};

export type AtsContactPresence = {
  email: boolean;
  phone: boolean;
  city: boolean;
  linkedIn: boolean;
  portfolio: boolean;
};

export type AtsExperience = {
  role: string;
  company: string;
  startDate: string;
  endDate: string;
  bullets: string[];
};

/**
 * Signals only a real file carries. Absent on the in-app path, where we render
 * the PDF ourselves and machine readability is guaranteed by construction.
 */
export type AtsFileSignals = {
  kind: "pdf" | "docx";
  pageCount: number;
  hasTextLayer: boolean;
  /** 0-1. How strongly the text order suggests columns an ATS would interleave. */
  columnSuspicion: number;
  /** 0-1. Share of replacement/undecodable glyphs. */
  mojibakeRatio: number;
};

export type AtsDocument = {
  rawText: string;
  sections: AtsSectionPresence;
  contact: AtsContactPresence;
  experiences: AtsExperience[];
  skills: string[];
  educationCount: number;
  wordCount: number;
  bulletCount: number;
  file?: AtsFileSignals;
};

export type AtsOfferContext = {
  title: string;
  requirements: string[];
  responsibilities: string[];
};

/**
 * Four sub-scores on 0..10 produced by the model for the `impact` dimension
 * only. The model never returns the overall score: the arithmetic belongs to
 * the engine, so swapping models cannot shift everyone's score.
 */
export type AtsLlmSignals = {
  actionVerbs: number;
  quantification: number;
  relevance: number;
  consistency: number;
  highlights: string[];
  improvements: string[];
};

export type AtsScoreContext = {
  offer?: AtsOfferContext | null;
  llm?: AtsLlmSignals | null;
};

export type AtsScoreResult = {
  engineVersion: string;
  overallScore: number;
  band: AtsScoreBand;
  dimensions: AtsDimension[];
  findings: AtsFinding[];
  /** False when the model was not consulted or its answer was unusable. */
  llmApplied: boolean;
  /**
   * The critical finding that held the score down, when one did.
   *
   * Present so the UI can say *why* a CV that looks good elsewhere is not
   * scoring well — a capped score with no explanation reads as a broken gauge.
   */
  cappedBy?: AtsFindingCode;
};
