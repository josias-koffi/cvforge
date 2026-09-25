import type {
  AtsScoreDimensionDetail,
  AtsScoreFindingDetail,
  AtsScoreSummary,
} from "@cvforge/types"

type Band = AtsScoreSummary["band"]

/** Mirrors the API's `AtsScanSummary`: a report unlocked on the landing. */
export type AtsScanSummary = {
  scanId: string
  overallScore: number
  band: Band
  unlockedAt: string
  expiresAt: string
}

export type AtsReportDimension = AtsScoreDimensionDetail
export type AtsReportFinding = AtsScoreFindingDetail

/** What a report shows, whether it comes from a landing scan or a generated CV. */
export type AtsReportResult = {
  dimensions: AtsReportDimension[]
  findings: AtsReportFinding[]
}

export type AtsScanReport = AtsScanSummary & {
  result: AtsReportResult & { engineVersion: string }
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

/**
 * What to do about each code, said as an action on the CV. Shown under the
 * finding wherever a report is read, so a candidate knows what to change and
 * not only what is wrong.
 */
export const ATS_FINDING_FIXES: Record<string, string> = {
  NO_TEXT_LAYER:
    "Exportez le CV depuis un traitement de texte plutôt qu'en image ou en scan.",
  MULTI_COLUMN_LAYOUT:
    "Passez sur une seule colonne : les logiciels lisent de gauche à droite, ligne par ligne.",
  TOO_MANY_PAGES:
    "Gardez les expériences récentes et pertinentes pour l'offre, résumez les plus anciennes.",
  GARBLED_CHARACTERS:
    "Utilisez une police standard et réexportez le fichier en PDF.",
  MISSING_EXPERIENCE_SECTION:
    "Ajoutez une section intitulée « Expérience professionnelle ».",
  MISSING_EDUCATION_SECTION: "Ajoutez une section « Formation », même courte.",
  MISSING_SKILLS_SECTION:
    "Ajoutez une section « Compétences » qui liste les outils et savoir-faire de l'offre que vous maîtrisez.",
  MISSING_SUMMARY_SECTION:
    "Ouvrez le CV par deux ou trois lignes qui résument votre profil pour ce poste.",
  MISSING_EMAIL: "Ajoutez votre adresse e-mail en tête du CV.",
  MISSING_PHONE: "Ajoutez un numéro de téléphone en tête du CV.",
  MISSING_LINKEDIN:
    "Ajoutez l'adresse de votre profil LinkedIn dans vos coordonnées.",
  MISSING_CITY:
    "Indiquez votre ville : beaucoup de recruteurs filtrent par localisation.",
  UNPARSABLE_DATES:
    "Écrivez les dates au format mois et année, par exemple « 03/2021 – 06/2024 ».",
  INCONSISTENT_DATE_FORMATS:
    "Utilisez le même format de date pour toutes les expériences.",
  FEW_BULLETS:
    "Détaillez chaque expérience en trois à cinq puces : une réalisation par puce.",
  TOO_SHORT:
    "Développez vos expériences : missions, outils utilisés et résultats obtenus.",
  TOO_LONG:
    "Resserrez : une puce par réalisation, et retirez ce que l'offre ne demande pas.",
  TABLE_MARKERS:
    "Remplacez les tableaux par du texte simple et des puces.",
  LOW_KEYWORD_COVERAGE:
    "Reprenez les termes exacts de l'offre pour les compétences que vous avez vraiment.",
  KEYWORD_STUFFING:
    "Citez chaque mot-clé là où il s'appuie sur une expérience, pas en liste répétée.",
  MISSING_ACTION_VERBS:
    "Commencez chaque puce par un verbe d'action : conçu, piloté, réduit, lancé…",
  MISSING_QUANTIFICATION:
    "Chiffrez vos résultats : volumes, délais, pourcentages, budgets.",
  UNSUPPORTED_SKILLS:
    "Pour chaque compétence listée, montrez-la dans une expérience où vous l'avez utilisée.",
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
