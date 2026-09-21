import type {
  InterviewDurationMinutes,
  InterviewRecruiterProfile,
  InterviewReportMetricKey,
  InterviewSessionStatus,
  Locale,
} from "@cvforge/types"

import type { OrbState } from "@/lib/interview/orb"
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

/**
 * Named by what the interview is, not just by its length: the duration is
 * what decides how much ground the recruiter covers.
 */
export const durationLabels: Record<InterviewDurationMinutes, string> = {
  10: "10 minutes — entretien de filtrage",
  20: "20 minutes — entretien RH complet",
  30: "30 minutes — entretien approfondi",
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

/**
 * What the orb is saying, in words.
 *
 * Written out under the orb because a sphere that swells says nothing to a
 * screen reader, and colour alone would not meet WCAG 1.4.1.
 */
export const orbStateLabels: Record<OrbState, string> = {
  idle: "En attente",
  listening: "À vous, parlez",
  recording: "Je vous écoute",
  thinking: "Analyse de votre réponse",
  speaking: "Le recruteur répond",
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
