import type { Metadata } from "next"
import Link from "next/link"
import type {
  InAppNotification,
  NotificationPreferencesResponse,
  PushConfigResponse,
} from "@cvforge/types"
import { CheckCheckIcon, ChevronRightIcon } from "lucide-react"
import { cn } from "cn"

import { markAllNotificationsRead } from "@/app/(app)/notifications/actions"
import { ActionButton } from "@/components/feedback/action-button"
import { PageHeader } from "@/components/layout/page-header"
import { NotificationList } from "@/components/notifications/notification-list"
import { PreferenceSwitch } from "@/components/notifications/preference-switch"
import { PushToggle } from "@/components/notifications/push-toggle"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { api } from "@/lib/api"

export const metadata: Metadata = { title: "Notifications" }

const UNREAD_FILTER = "non-lues"

/**
 * The inbox: new-offer alerts (no longer e-mailed), morning selections,
 * follow-ups and receipts. Settings sit beside it on wide screens, below it
 * on a phone: this device's push, the alerts, and the e-mails that remain.
 */
export default async function NotificationsPage(
  props: PageProps<"/notifications">
) {
  const { filtre } = await props.searchParams
  const unreadOnly = filtre === UNREAD_FILTER
  const [{ notifications }, preferences, push] = await Promise.all([
    api<{ notifications: InAppNotification[] }>("/notifications"),
    api<NotificationPreferencesResponse>("/notifications/preferences"),
    api<PushConfigResponse>("/notifications/push"),
  ])
  const unreadCount = notifications.filter((item) => !item.readAt).length
  const shown = unreadOnly
    ? notifications.filter((item) => !item.readAt)
    : notifications
  const email = preferences.preferences.email
  const emailOff = !preferences.emailDeliveryReady
  const alertsOn = preferences.preferences.jobAlerts.enabled

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Nouvelles offres, offres du jour, relances et confirmations."
        actions={
          unreadCount > 0 ? (
            <ActionButton
              variant="outline"
              size="sm"
              action={markAllNotificationsRead}
            >
              <CheckCheckIcon />
              Tout marquer comme lu
            </ActionButton>
          ) : null
        }
      />
      <div className="grid items-start gap-4 px-4 lg:px-6 @5xl/main:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="gap-0 overflow-hidden py-0">
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
            <nav
              aria-label="Filtrer les notifications"
              className="inline-flex rounded-lg bg-muted p-0.5 text-sm"
            >
              <FilterLink href="/notifications" active={!unreadOnly}>
                Toutes
              </FilterLink>
              <FilterLink
                href={`/notifications?filtre=${UNREAD_FILTER}`}
                active={unreadOnly}
              >
                Non lues
                {unreadCount > 0 ? (
                  <span className="ml-1.5 rounded-full bg-primary px-1.5 text-xs text-primary-foreground tabular-nums">
                    {unreadCount}
                  </span>
                ) : null}
              </FilterLink>
            </nav>
          </div>
          <NotificationList notifications={shown} unreadOnly={unreadOnly} />
        </Card>

        <div className="flex flex-col gap-4">
          {push.publicKey ? (
            <Card>
              <CardHeader>
                <CardTitle>Notifications sur vos appareils</CardTitle>
                <CardDescription>
                  {alertsOn
                    ? "Vos alertes de nouvelles offres arrivent ici et en notification, plus par e-mail."
                    : "Vos alertes de nouvelles offres sont désactivées."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PushToggle publicKey={push.publicKey} />
              </CardContent>
            </Card>
          ) : null}

          <Link
            href="/ma-recherche/alertes"
            className="group flex items-center gap-3 rounded-xl border bg-card p-4 text-sm transition-colors hover:bg-muted/50"
          >
            <div className="flex-1 space-y-0.5">
              <p className="font-medium">Régler mes alertes</p>
              <p className="text-muted-foreground">
                {alertsOn
                  ? "Quelles offres, à quel rythme, analyse IA."
                  : "Désactivées : réactivez-les pour être parmi les premiers."}
              </p>
            </div>
            <ChevronRightIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>

          <Card>
            <CardHeader>
              <CardTitle>E-mails</CardTitle>
              <CardDescription>
                {emailOff
                  ? "L'envoi d'e-mails n'est pas configuré sur ce serveur."
                  : "Les nouvelles offres ne passent plus par e-mail. Restent ceux-ci :"}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <PreferenceSwitch
                preference="jobDigest"
                label="Offres du jour"
                description="Votre sélection chaque matin. Désactivé, elle reste dans l'application."
                enabled={email.jobDigest}
                disabled={emailOff}
              />
              <PreferenceSwitch
                preference="applicationFollowUp"
                label="Relances de candidature"
                description="Quand une candidature envoyée reste sans réponse."
                enabled={email.applicationFollowUp}
                disabled={emailOff}
              />
              <PreferenceSwitch
                preference="applicationDeletionWarning"
                label="Avant la suppression d'une candidature"
                description="Quinze jours avant qu'une candidature inactive depuis un an soit supprimée. Le rappel reste visible ici."
                enabled={email.applicationDeletionWarning}
                disabled={emailOff}
              />
              <PreferenceSwitch
                preference="creditPurchaseConfirmed"
                label="Confirmation d'achat"
                description="Reçu après un achat de crédits."
                enabled={email.creditPurchaseConfirmed}
                disabled={emailOff}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}

function FilterLink({
  active,
  children,
  href,
}: {
  active: boolean
  children: React.ReactNode
  href: string
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex items-center rounded-md px-3 py-1 font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </Link>
  )
}
