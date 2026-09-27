/**
 * What an AI call was made for (US-154). Every call to OpenRouter is tagged
 * with one of these, so the admin cockpit can say what a CV, a letter or a
 * minute of interview actually costs. A new call site adds its id here.
 */
export const aiFeatures = [
  "cv_generation",
  "letter_generation",
  "cv_translation",
  "cv_import",
  "offer_structuring",
  "company_context",
  "ats_impact",
  "interview_report",
  "interview_voice",
  "interview_transcription",
  "interview_questions",
  "job_digest_rerank",
  "other",
] as const;
export type AiFeature = (typeof aiFeatures)[number];

export function isAiFeature(value: unknown): value is AiFeature {
  return (aiFeatures as readonly unknown[]).includes(value);
}
