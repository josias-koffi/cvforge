import type {
  InterviewRecruiterProfile,
  InterviewReportMetricKey,
  InterviewSessionStatus,
  Locale,
} from "@cvforge/types"

import type { VadStatus } from "@/lib/interview/vad"

export const profileLabels: Record<InterviewRecruiterProfile, string> = {
  standard: "Standard",
  aggressive: "Agressif",
  passive: "Passif",
  technical: "Technique",
  behavioral: "Comportemental",
}

export const profileHints: Record<InterviewRecruiterProfile, string> = {
  standard: "Entretien RH classique, neutre et professionnel.",
  aggressive: "Questions pièges, pression et relances incisives.",
  passive: "Ton sobre, silences implicites et relances vagues.",
  technical: "Hard skills, architecture et mises en situation.",
  behavioral: "Questions STAR sur des situations vécues.",
}

export const sessionStatusLabels: Record<InterviewSessionStatus, string> = {
  idle: "Non démarré",
  recording: "En cours",
  ready: "Prêt à conclure",
  completed: "Terminé",
  error: "Interrompu",
}

export const sessionStatusVariants: Record<
  InterviewSessionStatus,
  "outline" | "info" | "warning" | "success" | "destructive"
> = {
  idle: "outline",
  recording: "info",
  ready: "warning",
  completed: "success",
  error: "destructive",
}

export const metricLabels: Record<InterviewReportMetricKey, string> = {
  clarity: "Clarté",
  keywords: "Mots-clés",
  pacing: "Rythme",
  hesitations: "Hésitations",
  relevance: "Pertinence",
}

export const languageLabels: Record<Locale, string> = {
  fr: "Français",
  en: "Anglais",
}

/** What the candidate sees about the microphone, at a glance. */
export const vadStatusLabels: Record<VadStatus, string> = {
  listening: "À l'écoute",
  recording: "Enregistrement",
  processing: "Traitement",
  muted: "Micro coupé",
}

/** A score out of ten as a plain verdict, never colour alone (WCAG 1.4.1). */
export function scoreVerdict(score: number) {
  if (score >= 8) return "Point fort"
  if (score >= 6) return "Correct"
  return "À travailler"
}

/** Signed, so a trend never relies on an arrow or a colour to be readable. */
export function formatDelta(delta: number) {
  if (delta === 0) return "stable"

  return `${delta > 0 ? "+" : "−"}${Math.abs(delta).toFixed(1)}`
}
