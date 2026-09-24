import {
  AI_CREDIT_COSTS,
  interviewSessionCost,
  type AiCreditAction,
  type ApplicationStatus,
  type InterviewDurationMinutes,
} from "@cvforge/types"

export const statusLabels: Record<ApplicationStatus, string> = {
  draft: "Brouillon",
  interview_scheduled: "Entretien",
  offer_received: "Offre reçue",
  rejected: "Refusée",
  sent: "Envoyée",
}

export const statusVariants: Record<
  ApplicationStatus,
  "outline" | "info" | "warning" | "success" | "destructive"
> = {
  draft: "outline",
  interview_scheduled: "warning",
  offer_received: "success",
  rejected: "destructive",
  sent: "info",
}

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
})

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
})

export function formatDate(value: string | null | undefined) {
  return value ? dateFormatter.format(new Date(value)) : "—"
}

const timeFormatter = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
})

/** Clock time alone, for a transcript where the date is already in the header. */
export function formatTime(value: string) {
  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? "--:--" : timeFormatter.format(date)
}

export function formatDateTime(value: string | null | undefined) {
  return value ? dateTimeFormatter.format(new Date(value)) : "—"
}

const relativeFormatter = new Intl.RelativeTimeFormat("fr-FR", {
  numeric: "auto",
})
const MS_PER_DAY = 86_400_000

/**
 * "aujourd'hui", "hier", "il y a 5 jours": on a list of offers, how fresh one
 * is matters more than its date. Past a month, the date says it better.
 */
export function formatRelativeDays(
  value: string | null | undefined,
  now: number = Date.now()
) {
  if (!value) return "—"

  const time = new Date(value).getTime()
  if (Number.isNaN(time)) return "—"

  const days = Math.max(0, Math.floor((now - time) / MS_PER_DAY))
  if (days > 30) return dateFormatter.format(new Date(value))

  return relativeFormatter.format(-days, "day")
}

export function formatPrice(cents: number) {
  return new Intl.NumberFormat("fr-FR", {
    currency: "EUR",
    style: "currency",
  }).format(cents / 100)
}

export function formatCredits(amount: number) {
  return `${amount} crédit${Math.abs(amount) > 1 ? "s" : ""}`
}

/** e.g. "1 candidature", "20 candidatures". */
export function formatApplications(count: number) {
  return `${count} candidature${count > 1 ? "s" : ""}`
}

/** Cost label of an AI action, e.g. "Coût : 3 crédits". */
export function creditCostLabel(action: AiCreditAction) {
  return `Coût : ${formatCredits(AI_CREDIT_COSTS[action])}`
}

/**
 * An interview is priced by the minute, so its label has to follow the length
 * the candidate picked — `creditCostLabel` would quote the ten-minute price
 * above a selector set to thirty.
 */
export function interviewCostLabel(minutes: InterviewDurationMinutes) {
  return `Coût : ${formatCredits(interviewSessionCost(minutes))}`
}

/** e.g. "842 Ko", "1,8 Mo" — enough for a user to recognise the file they picked. */
export function formatFileSize(bytes: number) {
  const kilobytes = bytes / 1024

  if (kilobytes < 1000) return `${Math.max(1, Math.round(kilobytes))} Ko`

  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(
    kilobytes / 1024
  )} Mo`
}

export function splitLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}
