import type {
  InAppNotification,
  NotificationPreferences,
} from "@cvforge/types";
import { and, desc, eq } from "drizzle-orm";
import type { Database } from "../database/database.types";
import { notificationPreferences, notifications } from "../database/schema";
import type { NotificationsStore } from "./notifications.types";

type NotificationRow = typeof notifications.$inferSelect;

function toNotification(row: NotificationRow): InAppNotification {
  return {
    createdAt: row.createdAt.toISOString(),
    id: row.id,
    linkHref: row.linkHref,
    message: row.message,
    metadata: row.metadata,
    readAt: row.readAt?.toISOString() ?? null,
    title: row.title,
    type: row.type,
    userEmail: row.userEmail,
  };
}

function toRow(notification: InAppNotification) {
  return {
    createdAt: new Date(notification.createdAt),
    id: notification.id,
    linkHref: notification.linkHref,
    message: notification.message,
    metadata: notification.metadata ?? {},
    readAt: notification.readAt ? new Date(notification.readAt) : null,
    title: notification.title,
    type: notification.type,
    userEmail: notification.userEmail,
  };
}

export class PgNotificationsStore implements NotificationsStore {
  constructor(private readonly db: Database) {}

  async add(notification: InAppNotification) {
    const [row] = await this.db
      .insert(notifications)
      .values(toRow(notification))
      .returning();

    return toNotification(row!);
  }

  async findByIdForUserEmail(userEmail: string, notificationId: string) {
    const [row] = await this.db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userEmail, userEmail),
          eq(notifications.id, notificationId),
        ),
      );

    return row ? toNotification(row) : null;
  }

  async listByUserEmail(userEmail: string) {
    const rows = await this.db
      .select()
      .from(notifications)
      .where(eq(notifications.userEmail, userEmail))
      .orderBy(desc(notifications.createdAt));

    return rows.map(toNotification);
  }

  async readPreferences(userEmail: string): Promise<NotificationPreferences | null> {
    const [row] = await this.db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userEmail, userEmail));

    return row ? { email: row.email } : null;
  }

  async save(notification: InAppNotification) {
    const row = toRow(notification);

    const [saved] = await this.db
      .insert(notifications)
      .values(row)
      .onConflictDoUpdate({ target: notifications.id, set: row })
      .returning();

    return toNotification(saved!);
  }

  async savePreferences(
    userEmail: string,
    preferences: NotificationPreferences,
  ) {
    const row = {
      email: preferences.email,
      updatedAt: new Date(),
      userEmail,
    };

    await this.db
      .insert(notificationPreferences)
      .values(row)
      .onConflictDoUpdate({
        target: notificationPreferences.userEmail,
        set: row,
      });

    return preferences;
  }

  /**
   * Account purge. The file store dropped the notifications and left the
   * preferences row behind, which kept an email address on file after the
   * account was gone; both go now. The count stays the number of
   * notifications, which is what the privacy summary reports.
   */
  deleteByUserEmail(userEmail: string) {
    return this.db.transaction(async (tx) => {
      const deleted = await tx
        .delete(notifications)
        .where(eq(notifications.userEmail, userEmail))
        .returning({ id: notifications.id });

      await tx
        .delete(notificationPreferences)
        .where(eq(notificationPreferences.userEmail, userEmail));

      return deleted.length;
    });
  }
}
