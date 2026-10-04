import {
  APPLICATION_STATUS_SENT,
  NOTIFICATION_TYPE_APPLICATION_FOLLOW_UP,
  type ApplicationStatusHistoryEntry,
  type InAppNotification,
} from "@cvforge/types";
import { randomUUID } from "node:crypto";
import type { StoredApplication } from "../applications/applications.types";

/** Pure helpers of `NotificationsService` (split out with US-170). */

export function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

export function formatDay(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeZone: "Europe/Paris",
  }).format(new Date(iso));
}

export function sortNotifications(notifications: InAppNotification[]) {
  return [...notifications].sort((left, right) => {
    const leftUnread = left.readAt ? 1 : 0;
    const rightUnread = right.readAt ? 1 : 0;

    return (
      leftUnread - rightUnread ||
      right.createdAt.localeCompare(left.createdAt) ||
      left.id.localeCompare(right.id)
    );
  });
}

export function findSentStatusEntry(
  application: StoredApplication,
): ApplicationStatusHistoryEntry | null {
  const matches = application.statusHistory.filter(
    (entry) => entry.status === APPLICATION_STATUS_SENT,
  );

  return matches.length > 0 ? (matches[matches.length - 1] ?? null) : null;
}

export function buildReminderNotification(
  application: StoredApplication,
  reminderCreatedAt: string,
  delayDays: number,
): InAppNotification {
  const company = application.extracted.companyName ?? "cette entreprise";

  return {
    createdAt: reminderCreatedAt,
    id: randomUUID(),
    linkHref: `/candidatures?applicationId=${application.id}`,
    message: `${delayDays} jour(s) se sont écoulés depuis l'envoi de votre candidature ${application.extracted.title} chez ${company}. Pensez à relancer si vous n'avez toujours pas de retour.`,
    metadata: {
      applicationId: application.id,
    },
    readAt: null,
    title: `Relancer ${company}`,
    type: NOTIFICATION_TYPE_APPLICATION_FOLLOW_UP,
    userEmail: application.userEmail,
  };
}
