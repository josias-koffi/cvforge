import {
  NOTIFICATION_TYPE_JOB_ALERT,
  type InAppNotification,
  type JobAlertNotificationOffer,
} from "@cvforge/types";
import { dateInParis } from "../job-search/paris-time";
import { buildJobAlertNotification } from "./notification-builders";
import type { NotificationsStore } from "./notifications.types";

/**
 * Where the "Nouvelle offre pour vous" alerts land (E27): in the app. They no
 * longer go by e-mail — the morning recap is the only offers e-mail. Free: no
 * credit is involved (US-166).
 */
export class JobAlertInbox {
  constructor(
    private readonly store: Pick<NotificationsStore, "add" | "listByUserEmail">,
  ) {}

  /** `pushed` says whether it also went to the devices; the daily cap counts it. */
  add(input: {
    userEmail: string;
    offers: JobAlertNotificationOffer[];
    reasons: string[];
    pushed: boolean;
  }): Promise<InAppNotification> {
    return this.store.add(
      buildJobAlertNotification({
        ...input,
        createdAt: new Date().toISOString(),
      }),
    );
  }

  /** Alerts pushed to the devices on `day` (`YYYY-MM-DD`, Paris). */
  async countPushed(userEmail: string, day: string): Promise<number> {
    const notifications = await this.store.listByUserEmail(userEmail);

    return notifications.filter(
      (notification) =>
        notification.type === NOTIFICATION_TYPE_JOB_ALERT &&
        notification.metadata.pushed === true &&
        dateInParis(Date.parse(notification.createdAt)) === day,
    ).length;
  }
}
