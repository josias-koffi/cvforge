import type { AcquisitionTool, AiFeature } from "@cvforge/types"

/** What each tagged AI call was for, in the owner's words. */
export const aiFeatureLabels: Record<AiFeature, string> = {
  cv_generation: "Génération de CV",
  letter_generation: "Lettre de motivation",
  cv_translation: "Traduction de CV",
  cv_import: "Import de CV",
  offer_structuring: "Analyse d'offre",
  company_context: "Contexte entreprise",
  ats_impact: "Impact ATS",
  interview_report: "Rapport d'entretien",
  interview_voice: "Voix d'entretien",
  interview_transcription: "Transcription d'entretien",
  interview_questions: "Questions d'entretien",
  job_digest_rerank: "Tri des offres du jour",
  other: "Autre",
}

/** The landing's free tools, named as the visitor sees them. */
export const acquisitionToolLabels: Record<AcquisitionTool, string> = {
  ats: "Analyse ATS",
  keyword_match: "Comparateur CV ↔ offre",
  job_market: "Ce métier recrute-t-il ?",
  company_check: "Vérifier un employeur",
  interview_questions: "Questions d'entretien",
}

/**
 * Billed units of the unit-economics table, keyed by credit action. An
 * interview is billed per minute, so its unit is a minute. An unknown action
 * shows as is rather than disappearing.
 */
const creditActionLabels: Record<string, string> = {
  cv_generation: "CV généré",
  cv_import: "CV importé",
  interview_session: "Minute d'entretien",
  job_digest_rerank: "Tri IA des offres du jour",
  letter_generation: "Lettre générée",
  offer_enrichment: "Offre analysée",
}

/** French label of a billed action, falling back to its id. */
export function creditActionLabel(action: string) {
  return creditActionLabels[action] ?? action
}
