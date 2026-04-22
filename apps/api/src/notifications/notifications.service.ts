import { Injectable, NotFoundException } from "@nestjs/common";
import {
  APPLICATION_STATUS_SENT,
  NOTIFICATION_TYPE_APPLICATION_FOLLOW_UP,
  type ApplicationStatusHistoryEntry,
  type InAppNotification,
  type NotificationSummary,
} from "@cvforge/types";
import { randomUUID } from "node:crypto";
import type {
  ApplicationsStore,
  StoredApplication,
} from "../applications/applications.types";
import type {
  NotificationsConfig,
  NotificationsStore,
} from "./notifications.types";

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function sortNotifications(notifications: InAppNotification[]) {
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

function findSentStatusEntry(
  application: StoredApplication,
): ApplicationStatusHistoryEntry | null {
  const matches = application.statusHistory.filter(
    (entry) => entry.status === APPLICATION_STATUS_SENT,
  );

  return matches.length > 0 ? matches[matches.length - 1] ?? null : null;
}

function buildReminderNotification(
  application: StoredApplication,
  reminderCreatedAt: string,
): InAppNotification {
  const company = application.extracted.companyName ?? "cette entreprise";

  return {
    createdAt: reminderCreatedAt,
    id: randomUUID(),
    linkHref: `/candidatures?applicationId=${application.id}`,
    message: `Sept jours se sont ecoules depuis l'envoi de votre candidature ${application.extracted.title} chez ${company}. Pensez a relancer si vous n'avez toujours pas de retour.`,
    metadata: {
      applicationId: application.id,
    },
    readAt: null,
    title: `Relancer ${company}`,
    type: NOTIFICATION_TYPE_APPLICATION_FOLLOW_UP,
    userEmail: application.userEmail,
  };
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationsStore: NotificationsStore,
    private readonly applicationsStore: ApplicationsStore,
    private readonly config: NotificationsConfig,
  ) {}

  listNotifications(userEmail: string) {
    this.ensureDueNotifications(userEmail);
    return sortNotifications(this.notificationsStore.listByUserEmail(userEmail));
  }

  getSummary(userEmail: string): NotificationSummary {
    const notifications = this.listNotifications(userEmail);

    return {
      unreadCount: notifications.filter((notification) => !notification.readAt)
        .length,
    };
  }

  markAsRead(userEmail: string, notificationId: string) {
    this.ensureDueNotifications(userEmail);
    const notification = this.notificationsStore.findByIdForUserEmail(
      userEmail,
      notificationId,
    );

    if (!notification) {
      throw new NotFoundException("La notification est introuvable.");
    }

    if (notification.readAt) {
      return notification;
    }

    const updatedNotification: InAppNotification = {
      ...notification,
      readAt: new Date().toISOString(),
    };

    return this.notificationsStore.save(updatedNotification);
  }

  private ensureDueNotifications(userEmail: string) {
    const notifications = this.notificationsStore.listByUserEmail(userEmail);
    const existingApplicationReminderIds = new Set(
      notifications
        .filter(
          (notification) =>
            notification.type === NOTIFICATION_TYPE_APPLICATION_FOLLOW_UP &&
            notification.metadata.applicationId,
        )
        .map((notification) => notification.metadata.applicationId as string),
    );
    const now = new Date();

    this.applicationsStore.listByUserEmail(userEmail).forEach((application) => {
      if (
        application.status !== APPLICATION_STATUS_SENT ||
        existingApplicationReminderIds.has(application.id)
      ) {
        return;
      }

      const sentEntry = findSentStatusEntry(application);

      if (!sentEntry) {
        return;
      }

      const reminderAt = addDays(
        new Date(sentEntry.changedAt),
        this.config.followUpDelayDays,
      );

      if (reminderAt > now) {
        return;
      }

      this.notificationsStore.add(
        buildReminderNotification(application, reminderAt.toISOString()),
      );
      existingApplicationReminderIds.add(application.id);
    });
  }
}
