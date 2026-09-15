import type { ApplicationStatus } from "@cvforge/types"

export const statusLabels: Record<ApplicationStatus, string> = {
  draft: "Brouillon",
  interview_scheduled: "Entretien",
  offer_received: "Offre reçue",
  rejected: "Refusée",
  sent: "Envoyée",
}

export const statusVariants: Record<
  ApplicationStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  draft: "outline",
  interview_scheduled: "default",
  offer_received: "default",
  rejected: "destructive",
  sent: "secondary",
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

export function formatDateTime(value: string | null | undefined) {
  return value ? dateTimeFormatter.format(new Date(value)) : "—"
}

export function formatPrice(cents: number) {
  return new Intl.NumberFormat("fr-FR", {
    currency: "EUR",
    style: "currency",
  }).format(cents / 100)
}

export function splitLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}
