import type { AtsScoreSummary } from "@cvforge/types"

type Band = AtsScoreSummary["band"]

/** Mirrors the API's `AtsScanSummary`: a report unlocked on the landing. */
export type AtsScanSummary = {
  scanId: string
  overallScore: number
  band: Band
  unlockedAt: string
  expiresAt: string
}

export type AtsReportDimension = {
  key: string
  status: "scored" | "unavailable"
  score: number | null
}

export type AtsReportFinding = {
  code: string
  severity: "critical" | "warning" | "info"
  dimension: string
}

export type AtsScanReport = AtsScanSummary & {
  result: {
    engineVersion: string
    dimensions: AtsReportDimension[]
    findings: AtsReportFinding[]
  }
}

/** The summary shape the score badge reads. */
export function scoreOf(scan: AtsScanSummary): AtsScoreSummary {
  return { band: scan.band, engineVersion: "", overallScore: scan.overallScore }
}

/**
 * Wording for the engine's codes. Copied from the landing dictionary (fr),
 * as `ATS_BAND_LABELS` already is: the two should be changed together.
 */
export const ATS_DIMENSION_LABELS: Record<string, string> = {
  machineReadability: "Lisibilité machine",
  structure: "Structure et sections",
  keywords: "Adéquation à l'offre",
  impact: "Contenu et impact",
  contactability: "Coordonnées",
  formatHygiene: "Dates, puces et longueur",
}

export const ATS_FINDING_LABELS: Record<string, string> = {
  NO_TEXT_LAYER: "Le fichier ne contient aucun texte lisible par une machine",
  MULTI_COLUMN_LAYOUT:
    "La mise en page sur plusieurs colonnes brouille l'ordre de lecture",
  TOO_MANY_PAGES: "Le CV dépasse deux pages",
  GARBLED_CHARACTERS: "Des caractères ressortent illisibles à l'extraction",
  MISSING_EXPERIENCE_SECTION: "Aucune section « Expérience » identifiée",
  MISSING_EDUCATION_SECTION: "Aucune section « Formation » identifiée",
  MISSING_SKILLS_SECTION: "Aucune section « Compétences » identifiée",
  MISSING_SUMMARY_SECTION: "Aucun résumé en tête de CV",
  MISSING_EMAIL: "Aucune adresse email détectée",
  MISSING_PHONE: "Aucun numéro de téléphone détecté",
  MISSING_LINKEDIN: "Aucun profil LinkedIn détecté",
  MISSING_CITY: "Aucune ville détectée",
  UNPARSABLE_DATES: "Les dates ne sont pas dans un format exploitable",
  INCONSISTENT_DATE_FORMATS:
    "Les formats de date varient d'une expérience à l'autre",
  FEW_BULLETS: "Les expériences ne sont pas détaillées en puces",
  TOO_SHORT: "Le CV manque de matière : peu de contenu à indexer",
  TOO_LONG: "Le CV est trop long",
  TABLE_MARKERS: "Des tableaux perturbent l'extraction du texte",
  LOW_KEYWORD_COVERAGE: "Le vocabulaire de l'offre est peu repris",
  KEYWORD_STUFFING: "Un même mot-clé est répété à l'excès",
  MISSING_ACTION_VERBS: "Les puces ne commencent pas par un verbe d'action",
  MISSING_QUANTIFICATION: "Les résultats ne sont pas chiffrés",
  UNSUPPORTED_SKILLS:
    "Des compétences annoncées ne sont étayées par aucune expérience",
}

export const ATS_SEVERITY_LABELS: Record<AtsReportFinding["severity"], string> =
  {
    critical: "Critique",
    warning: "À corriger",
    info: "À savoir",
  }

const SEVERITY_ORDER: AtsReportFinding["severity"][] = [
  "critical",
  "warning",
  "info",
]

/** Critical first: the order a candidate should fix them in. */
export function sortFindings(findings: AtsReportFinding[]) {
  return [...findings].sort(
    (left, right) =>
      SEVERITY_ORDER.indexOf(left.severity) -
      SEVERITY_ORDER.indexOf(right.severity)
  )
}
