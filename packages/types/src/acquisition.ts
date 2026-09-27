/**
 * The free tools of the landing page (E23), and the steps of their funnel.
 *
 * Shared by the landing, which emits the events, the API, which refuses any
 * other value, and the admin, which labels them. Each new tool adds its id
 * here; nothing else has to be told.
 */
export const acquisitionTools = [
  "ats",
  "keyword_match",
  "job_market",
  "company_check",
  "interview_questions",
] as const;
export type AcquisitionTool = (typeof acquisitionTools)[number];

/** In funnel order: every step is a subset of the one before it. */
export const acquisitionSteps = [
  "view",
  "result",
  "cta_click",
  "email_submitted",
] as const;
export type AcquisitionStep = (typeof acquisitionSteps)[number];

export function isAcquisitionTool(value: unknown): value is AcquisitionTool {
  return (acquisitionTools as readonly unknown[]).includes(value);
}

export function isAcquisitionStep(value: unknown): value is AcquisitionStep {
  return (acquisitionSteps as readonly unknown[]).includes(value);
}

/**
 * What the free CV ↔ offer comparator returns (US-136). Terms are normalised
 * (lowercase, no accents), most frequent in the offer first.
 */
export type PublicKeywordMatchResponse = {
  coverage: number;
  band: "low" | "fair" | "good";
  matchedCount: number;
  missingCount: number;
  matched: string[];
  missing: string[];
};

/** One likely question and what the recruiter is after with it (US-141). */
export type InterviewQuestion = {
  question: string;
  intent: string;
  kind: InterviewQuestionKind;
};

export const interviewQuestionKinds = [
  "motivation",
  "experience",
  "technical",
  "behavioral",
  "situational",
] as const;
export type InterviewQuestionKind = (typeof interviewQuestionKinds)[number];

/** What the free likely-interview-questions tool returns: always five. */
export type PublicInterviewQuestionsResponse = {
  questions: InterviewQuestion[];
};
