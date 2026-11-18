import {
  APPLICATION_STATUS_SENT,
  JOB_ALERT_VERDICT_LABELS,
  NOTIFICATION_TYPE_APPLICATION_FOLLOW_UP,
  NOTIFICATION_TYPE_JOB_ALERT,
  type ApplicationStatusHistoryEntry,
  type InAppNotification,
  type JobAlertNotificationOffer,
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

/**
 * One notification per batch of alerts (E27): a single offer is named with
 * its company and why it matches; several are counted, the first ones named.
 * The source stays cited, as the France Travail licence asks.
 */
export function buildJobAlertNotification(input: {
  userEmail: string;
  offers: JobAlertNotificationOffer[];
  reasons: string[];
  pushed: boolean;
  createdAt: string;
}): InAppNotification {
  const [first, ...others] = input.offers;
  if (!first) throw new Error("A job alert needs at least one offer.");

  const single = others.length === 0;
  const verdict = first.verdict
    ? ` Analyse IA : ${JOB_ALERT_VERDICT_LABELS[first.verdict].toLowerCase()}.`
    : "";

  return {
    createdAt: input.createdAt,
    id: randomUUID(),
    linkHref: single
      ? `/offres-du-jour/postuler/${encodeURIComponent(first.jobId)}`
      : "/offres-du-jour",
    message: single
      ? [
          `${offerWhere(first)}.`,
          input.reasons.length > 0 ? `Pour ${input.reasons.join(", ")}.` : "",
          `Source : ${first.sourceLabel}.${verdict}`,
        ]
          .filter(Boolean)
          .join(" ")
      : `${input.offers
          .slice(0, 3)
          .map((offer) => offer.title)
          .join(" · ")}${input.offers.length > 3 ? ` et ${input.offers.length - 3} autre(s)` : ""}.`,
    metadata: {
      matchCount: input.offers.length,
      offers: input.offers,
      pushed: input.pushed,
    },
    readAt: null,
    title: single
      ? `Nouvelle offre : ${first.title}`
      : `${input.offers.length} nouvelles offres pour vous`,
    type: NOTIFICATION_TYPE_JOB_ALERT,
    userEmail: input.userEmail,
  };
}

function offerWhere(offer: JobAlertNotificationOffer) {
  return [offer.companyName, offer.locationLabel].filter(Boolean).join(", ") ||
    "Offre publiée à l'instant";
}
