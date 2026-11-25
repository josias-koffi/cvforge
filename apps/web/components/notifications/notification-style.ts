import type { NotificationType } from "@cvforge/types"
import {
  BellIcon,
  BriefcaseBusinessIcon,
  ReceiptIcon,
  ReplyIcon,
  SunriseIcon,
  Trash2Icon,
  TriangleAlertIcon,
  type LucideIcon,
} from "lucide-react"
import { APP_TIME_ZONE } from "@/lib/format"

/** One icon and one tint per kind, so the list reads at a glance. */
export const NOTIFICATION_STYLES: Record<
  NotificationType,
  { icon: LucideIcon; tint: string; label: string }
> = {
  application_deletion_warning: {
    icon: Trash2Icon,
    label: "Suppression",
    tint: "bg-warning/12 text-warning",
  },
  application_follow_up: {
    icon: ReplyIcon,
    label: "Relance",
    tint: "bg-info/12 text-info",
  },
  credit_purchase_confirmed: {
    icon: ReceiptIcon,
    label: "Achat",
    tint: "bg-success/12 text-success",
  },
  job_alert: {
    icon: BriefcaseBusinessIcon,
    label: "Nouvelle offre",
    tint: "bg-primary/10 text-primary",
  },
  job_digest: {
    icon: SunriseIcon,
    label: "Offres du jour",
    tint: "bg-spark/20 text-spark-foreground dark:text-spark",
  },
  openrouter_low_balance: {
    icon: TriangleAlertIcon,
    label: "Admin",
    tint: "bg-destructive/10 text-destructive",
  },
}

export const FALLBACK_STYLE = {
  icon: BellIcon,
  label: "Notification",
  tint: "bg-muted text-muted-foreground",
}

const dayKeyFormatter = new Intl.DateTimeFormat("fr-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: APP_TIME_ZONE,
  year: "numeric",
})
const dayLabelFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  timeZone: APP_TIME_ZONE,
  weekday: "long",
})
const timeFormatter = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: APP_TIME_ZONE,
})

/** `YYYY-MM-DD` in Paris: the server may run in UTC, the candidate does not. */
export function parisDay(iso: string) {
  return dayKeyFormatter.format(new Date(iso))
}

export function parisTime(iso: string) {
  return timeFormatter.format(new Date(iso))
}

export function dayHeading(day: string, now: number = Date.now()) {
  const today = parisDay(new Date(now).toISOString())
  const yesterday = parisDay(new Date(now - 86_400_000).toISOString())
  if (day === today) return "Aujourd'hui"
  if (day === yesterday) return "Hier"

  const label = dayLabelFormatter.format(new Date(`${day}T12:00:00Z`))
  return label.charAt(0).toUpperCase() + label.slice(1)
}
