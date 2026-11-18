import type { InAppNotification } from "@cvforge/types"
import { BellIcon } from "lucide-react"

import { NotificationItem } from "@/components/notifications/notification-item"
import {
  dayHeading,
  parisDay,
} from "@/components/notifications/notification-style"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

/** The inbox, newest first, one section per Paris day. */
export function NotificationList({
  notifications,
  unreadOnly,
}: {
  notifications: InAppNotification[]
  unreadOnly: boolean
}) {
  if (notifications.length === 0) {
    return (
      <Empty className="py-16">
        <EmptyHeader>
          <EmptyMedia
            variant="icon"
            className="bg-primary/10 text-primary motion-safe:animate-float"
          >
            <BellIcon />
          </EmptyMedia>
          <EmptyTitle>
            {unreadOnly ? "Tout est lu" : "Rien de nouveau"}
          </EmptyTitle>
          <EmptyDescription>
            Nouvelles offres, relances et confirmations arriveront ici.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="divide-y">
      {groupByDay(notifications).map(([day, items]) => (
        <section key={day} aria-label={dayHeading(day)}>
          <h2 className="sticky top-0 z-20 bg-card/95 px-4 py-2 text-xs font-medium text-muted-foreground backdrop-blur sm:px-6">
            {dayHeading(day)}
          </h2>
          <ul className="divide-y">
            {items.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function groupByDay(notifications: InAppNotification[]) {
  const newestFirst = [...notifications].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt)
  )
  const days = new Map<string, InAppNotification[]>()

  for (const notification of newestFirst) {
    const day = parisDay(notification.createdAt)
    days.set(day, [...(days.get(day) ?? []), notification])
  }

  return [...days.entries()]
}
