import { Injectable, NotFoundException } from "@nestjs/common";
import {
  APPLICATION_STATUS_SENT,
  NOTIFICATION_TYPE_APPLICATION_DELETION_WARNING,
  NOTIFICATION_TYPE_APPLICATION_FOLLOW_UP,
  NOTIFICATION_TYPE_JOB_DIGEST,
  type InAppNotification,
  type JobAlertPreferences,
  type NotificationPreferencesResponse,
  type NotificationSummary,
} from "@cvforge/types";
import { randomUUID } from "node:crypto";
import type { ApplicationsStore } from "../applications/applications.types";
import type {
  NotificationsConfig,
  NotificationsStore,
} from "./notifications.types";
import { NotificationsMailerService } from "./notifications-mailer.service";
import type {
  ExpiringApplicationLine,
  JobAlertEmailInput,
} from "../mail/emails";
import {
  createDefaultPreferences,
  mergePreferences,
  type PreferencesUpdate,
} from "./notification-preferences";
import {
  addDays,
  buildReminderNotification,
  findSentStatusEntry,
  formatDay,
  sortNotifications,
} from "./notification-builders";

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

  /**
   * Only the values sent change: a switch left out keeps its state, rather
   * than being overwritten with `undefined` as the e-mail switches used to be.
   */
  async updatePreferences(
    userEmail: string,
    update: PreferencesUpdate,
  ): Promise<NotificationPreferencesResponse> {
    const current = await this.readPreferences(userEmail);

    await this.notificationsStore.savePreferences(
      userEmail,
      mergePreferences(current, update),
    );

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

  /**
   * Announces the morning selection: one in-app notification, and the e-mail
   * unless the candidate turned it off.
   *
   * `createOncePerDay` is what keeps a second run of the digest from
   * announcing the same morning twice.
   */
  async sendJobDigestNotification(input: {
    userEmail: string;
    digestDate: string;
    offers: Array<{
      title: string;
      companyName: string;
      locationLabel: string;
      score: number;
      reason: string;
    }>;
    totalCount: number;
    /** What moved in the candidate's job market this month (US-128). */
    marketNotes?: string[];
    emailEnabled: boolean;
    digestUrl: string;
    preferencesUrl: string;
  }) {
    const notification = await this.createOncePerDay({
      linkHref: "/offres-du-jour",
      message: `${input.totalCount} offre(s) correspondent à votre recherche ce matin.`,
      metadata: {
        digestDate: input.digestDate,
        matchCount: input.totalCount,
      },
      title: "Vos offres du jour",
      type: NOTIFICATION_TYPE_JOB_DIGEST,
      userEmail: input.userEmail,
    });

    // Already announced today: the e-mail must not go out a second time
    // either.
    if (!notification) return null;

    const preferences = await this.readPreferences(input.userEmail);

    if (input.emailEnabled && preferences.email.jobDigest) {
      await this.notificationsMailer.sendJobDigestEmail({
        digestUrl: input.digestUrl,
        marketNotes: input.marketNotes ?? [],
        offers: input.offers,
        preferencesUrl: input.preferencesUrl,
        to: input.userEmail,
        totalCount: input.totalCount,
      });
    }

    return notification;
  }

  /**
   * Applications untouched for a year go in 15 days (US-170). The in-app
   * notice is always written: the e-mail can be turned off, the deletion
   * cannot. Returns whether the e-mail went out.
   */
  async sendApplicationDeletionWarning(input: {
    userEmail: string;
    applications: Array<ExpiringApplicationLine & { id: string }>;
  }): Promise<{ emailed: boolean }> {
    const count = input.applications.length;
    const first = input.applications[0];
    if (!first) return { emailed: false };

    await this.notificationsStore.add({
      createdAt: new Date().toISOString(),
      id: randomUUID(),
      linkHref: "/candidatures",
      message:
        count > 1
          ? `${count} candidatures sans modification depuis un an seront supprimées à partir du ${formatDay(first.deletesAt)}. Gardez celles qui vous servent encore.`
          : `« ${first.title} », sans modification depuis un an, sera supprimée le ${formatDay(first.deletesAt)}. Gardez-la si elle vous sert encore.`,
      metadata: count > 1 ? {} : { applicationId: first.id },
      readAt: null,
      title:
        count > 1
          ? "Des candidatures vont être supprimées"
          : "Une candidature va être supprimée",
      type: NOTIFICATION_TYPE_APPLICATION_DELETION_WARNING,
      userEmail: input.userEmail,
    });

    const preferences = await this.readPreferences(input.userEmail);
    if (!preferences.email.applicationDeletionWarning) return { emailed: false };

    return {
      emailed: await this.notificationsMailer.sendApplicationDeletionWarningEmail({
        applications: input.applications,
        to: input.userEmail,
      }),
    };
  }

  /** What the alert dispatcher and the live matcher read (US-166). */
  async readJobAlertPreferences(userEmail: string): Promise<JobAlertPreferences> {
    return (await this.readPreferences(userEmail)).jobAlerts;
  }

  /**
   * The "Nouvelle offre pour vous" e-mail. Free: no credit is involved
   * (US-166). Returns false when e-mail delivery is not configured.
   */
  sendJobAlertEmail(input: Omit<JobAlertEmailInput, "preferencesUrl"> & {
    to: string;
    preferencesUrl: string;
  }): Promise<boolean> {
    return this.notificationsMailer.sendJobAlertEmail(input);
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
        buildReminderNotification(
          application,
          reminderAt.toISOString(),
          this.config.followUpDelayDays,
        ),
      );
      existingApplicationReminderIds.add(application.id);

      if (preferences.email.applicationFollowUp) {
        await this.notificationsMailer.sendApplicationFollowUpEmail({
          companyName: application.extracted.companyName ?? "cette entreprise",
          delayDays: this.config.followUpDelayDays,
          followUpUrl: notification.linkHref,
          jobTitle: application.extracted.title,
          to: userEmail,
        });
      }
    }
  }
}
