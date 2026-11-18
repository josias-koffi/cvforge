"use client"

import { useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  JOB_ALERT_VERDICT_LABELS,
  type InAppNotification,
} from "@cvforge/types"
import { CheckIcon } from "lucide-react"
import { cn } from "cn"

import { markNotificationRead } from "@/app/(app)/notifications/actions"
import {
  FALLBACK_STYLE,
  NOTIFICATION_STYLES,
  parisTime,
} from "@/components/notifications/notification-style"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const OFFERS_SHOWN = 3

/**
 * One row of the inbox. The whole row opens the notification and marks it
 * read on the way; the check button marks it read without leaving.
 */
export function NotificationItem({
  notification,
}: {
  notification: InAppNotification
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const style = NOTIFICATION_STYLES[notification.type] ?? FALLBACK_STYLE
  const Icon = style.icon
  const unread = !notification.readAt
  const offers = notification.metadata.offers ?? []

  function markRead() {
    startTransition(async () => {
      await markNotificationRead(notification.id)
      router.refresh()
    })
  }

  return (
    <li
      className={cn(
        "group relative flex gap-3 px-4 py-4 transition-colors hover:bg-muted/50 sm:gap-4 sm:px-6",
        unread && "bg-primary/[0.03]"
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full [&>svg]:size-4",
          style.tint
        )}
      >
        <Icon />
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={notification.linkHref || "/notifications"}
            onClick={() => {
              if (unread) void markNotificationRead(notification.id)
            }}
            className={cn(
              "min-w-0 text-sm leading-snug after:absolute after:inset-0 hover:underline focus-visible:outline-none",
              unread ? "font-semibold" : "font-medium"
            )}
          >
            {notification.title}
          </Link>
          <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground tabular-nums">
            {parisTime(notification.createdAt)}
            {unread ? (
              <span
                className="size-2 rounded-full bg-primary"
                aria-label="Non lue"
              />
            ) : null}
          </span>
        </div>
        {offers.length > 1 ? (
          <ul className="space-y-1 text-sm">
            {offers.slice(0, OFFERS_SHOWN).map((offer) => (
              <li
                key={offer.jobId}
                className="flex flex-wrap items-center gap-x-2 text-muted-foreground"
              >
                <span className="truncate font-medium text-foreground">
                  {offer.title}
                </span>
                <span className="truncate">
                  {[offer.companyName, offer.locationLabel]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                {offer.verdict ? (
                  <Badge variant="spark">
                    {JOB_ALERT_VERDICT_LABELS[offer.verdict]}
                  </Badge>
                ) : null}
              </li>
            ))}
            {offers.length > OFFERS_SHOWN ? (
              <li className="text-xs text-muted-foreground">
                et {offers.length - OFFERS_SHOWN} autre(s) dans vos offres du
                jour
              </li>
            ) : null}
          </ul>
        ) : (
          <p className="line-clamp-3 text-sm text-muted-foreground">
            {notification.message}
          </p>
        )}
      </div>
      {unread ? (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Marquer comme lue"
          title="Marquer comme lue"
          disabled={pending}
          onClick={markRead}
          className="relative z-10 -my-1 size-8 shrink-0 self-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
        >
          <CheckIcon />
        </Button>
      ) : null}
    </li>
  )
}
