import type { Metadata } from "next"
import Link from "next/link"
import type { InAppNotification, NotificationPreferencesResponse } from "@cvforge/types"
import { BellIcon, CheckIcon } from "lucide-react"

import { markNotificationRead } from "@/app/(app)/notifications/actions"
import { ActionButton } from "@/components/feedback/action-button"
import { PageHeader } from "@/components/layout/page-header"
import { PreferenceSwitch } from "@/components/notifications/preference-switch"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { api } from "@/lib/api"
import { formatDateTime } from "@/lib/format"

export const metadata: Metadata = { title: "Notifications" }

export default async function NotificationsPage() {
  const [{ notifications }, preferences] = await Promise.all([
    api<{ notifications: InAppNotification[] }>("/notifications"),
    api<NotificationPreferencesResponse>("/notifications/preferences"),
  ])

  return (
    <>
      <PageHeader title="Notifications" description="Relances de candidatures et confirmations d'achat." />
      <div className="grid items-start gap-4 px-4 lg:px-6 @5xl/main:grid-cols-[1fr_360px]">
        <Card>
          <CardContent className="p-0">
            {notifications.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <BellIcon />
                  </EmptyMedia>
                  <EmptyTitle>Rien de nouveau</EmptyTitle>
                  <EmptyDescription>Vos notifications apparaîtront ici.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ul className="divide-y">
                {notifications.map((notification) => (
                  <li key={notification.id} className="flex items-start gap-4 px-6 py-4">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Link href={notification.linkHref} className="font-medium hover:underline">
                          {notification.title}
                        </Link>
                        {notification.readAt ? null : <Badge>Nouveau</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {formatDateTime(notification.createdAt)}
                      </p>
                    </div>
                    {notification.readAt ? null : (
                      <ActionButton
                        variant="ghost"
                        size="sm"
                        action={markNotificationRead.bind(null, notification.id)}
                      >
                        <CheckIcon />
                        Marquer comme lue
                      </ActionButton>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>E-mails</CardTitle>
            <CardDescription>
              {preferences.emailDeliveryReady
                ? "Choisissez les e-mails que vous recevez."
                : "L'envoi d'e-mails n'est pas configuré sur ce serveur."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <PreferenceSwitch
              preference="applicationFollowUp"
              label="Relances de candidature"
              description="Rappel quand une candidature envoyée reste sans réponse."
              enabled={preferences.preferences.email.applicationFollowUp}
              disabled={!preferences.emailDeliveryReady}
            />
            <PreferenceSwitch
              preference="creditPurchaseConfirmed"
              label="Confirmation d'achat"
              description="Reçu après un achat de crédits."
              enabled={preferences.preferences.email.creditPurchaseConfirmed}
              disabled={!preferences.emailDeliveryReady}
            />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
