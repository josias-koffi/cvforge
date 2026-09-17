import { Injectable, NotFoundException } from "@nestjs/common";
import {
  APPLICATION_STATUS_SENT,
  NOTIFICATION_TYPE_APPLICATION_FOLLOW_UP,
  type ApplicationStatusHistoryEntry,
  type InAppNotification,
  type NotificationPreferences,
  type NotificationPreferencesResponse,
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
import { NotificationsMailerService } from "./notifications-mailer.service";

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

function createDefaultPreferences(): NotificationPreferences {
  return {
    email: {
      applicationFollowUp: true,
      creditPurchaseConfirmed: true,
    },
  };
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationsStore: NotificationsStore,
    private readonly applicationsStore: ApplicationsStore,
    private readonly config: NotificationsConfig,
    private readonly notificationsMailer: NotificationsMailerService,
  ) {}

  async listNotifications(userEmail: string) {
    await this.ensureDueNotifications(userEmail);
    return sortNotifications(
      await this.notificationsStore.listByUserEmail(userEmail),
    );
  }

  async getSummary(userEmail: string): Promise<NotificationSummary> {
    const notifications = await this.listNotifications(userEmail);

    return {
      unreadCount: notifications.filter((notification) => !notification.readAt)
        .length,
    };
  }

  async markAsRead(userEmail: string, notificationId: string) {
    await this.ensureDueNotifications(userEmail);
    const notification = await this.notificationsStore.findByIdForUserEmail(
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

  async getPreferences(
    userEmail: string,
  ): Promise<NotificationPreferencesResponse> {
    const { provider, ready } = this.notificationsMailer.getDeliveryStatus();

    return {
      emailDeliveryReady: ready,
      preferences: await this.readPreferences(userEmail),
      provider,
    };
  }

  async updatePreferences(
    userEmail: string,
    partial: Partial<NotificationPreferences["email"]>,
  ): Promise<NotificationPreferencesResponse> {
    const current = await this.readPreferences(userEmail);
    const nextPreferences: NotificationPreferences = {
      email: {
        ...current.email,
        ...partial,
      },
    };

    await this.notificationsStore.savePreferences(userEmail, nextPreferences);

    return this.getPreferences(userEmail);
  }

  /**
   * Writes an in-app notification unless the same user already received one of
   * that type on the same UTC day.
   *
   * The only write path into notifications that is not derived from
   * applications: everything else is materialised lazily on read by
   * `ensureDueNotifications`. Returns `null` when the daily one was already
   * sent, so callers can tell "sent" from "suppressed".
   *
   * Deduplication is a read-then-filter, like `ensureDueNotifications`, not a
   * unique index — two instances alerting in the same second could both write.
   * Acceptable for an admin alert; revisit if it ever gates something.
   */
  async createOncePerDay(draft: {
    linkHref: string;
    message: string;
    metadata?: InAppNotification["metadata"];
    title: string;
    type: InAppNotification["type"];
    userEmail: string;
  }): Promise<InAppNotification | null> {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const existing = await this.notificationsStore.listByUserEmail(
      draft.userEmail,
    );
    const alreadySentToday = existing.some(
      (notification) =>
        notification.type === draft.type &&
        notification.createdAt.slice(0, 10) === today,
    );

    if (alreadySentToday) {
      return null;
    }

    return this.notificationsStore.add({
      createdAt: now.toISOString(),
      id: randomUUID(),
      linkHref: draft.linkHref,
      message: draft.message,
      metadata: draft.metadata ?? {},
      readAt: null,
      title: draft.title,
      type: draft.type,
      userEmail: draft.userEmail,
    });
  }

  async sendCreditPurchaseConfirmationEmail(input: {
    amountCents: number;
    credits: number;
    offerName: string;
    userEmail: string;
  }) {
    const preferences = await this.readPreferences(input.userEmail);

    if (!preferences.email.creditPurchaseConfirmed) {
      return;
    }

    await this.notificationsMailer.sendCreditPurchaseConfirmationEmail({
      amountCents: input.amountCents,
      credits: input.credits,
      offerName: input.offerName,
      to: input.userEmail,
    });
  }

  private async readPreferences(userEmail: string) {
    return (
      (await this.notificationsStore.readPreferences(userEmail)) ??
      createDefaultPreferences()
    );
  }

  private async ensureDueNotifications(userEmail: string) {
    const notifications =
      await this.notificationsStore.listByUserEmail(userEmail);
    const preferences = await this.readPreferences(userEmail);
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

    const owned = await this.applicationsStore.listByUserEmail(userEmail);

    for (const application of owned) {
      if (
        application.status !== APPLICATION_STATUS_SENT ||
        existingApplicationReminderIds.has(application.id)
      ) {
        continue;
      }

      const sentEntry = findSentStatusEntry(application);

      if (!sentEntry) {
        continue;
      }

      const reminderAt = addDays(
        new Date(sentEntry.changedAt),
        this.config.followUpDelayDays,
      );

      if (reminderAt > now) {
        continue;
      }

      const notification = await this.notificationsStore.add(
        buildReminderNotification(application, reminderAt.toISOString()),
      );
      existingApplicationReminderIds.add(application.id);

      if (preferences.email.applicationFollowUp) {
        await this.notificationsMailer.sendApplicationFollowUpEmail({
          companyName: application.extracted.companyName ?? "cette entreprise",
          followUpUrl: notification.linkHref,
          jobTitle: application.extracted.title,
          to: userEmail,
        });
      }
    }
  }
}
