import type {
  InAppNotification,
  NotificationPreferences,
} from "@cvforge/types";
import { existsSync, readFileSync } from "node:fs";
import type { Database } from "./database.types";
import {
  dataImports,
  notificationPreferences,
  notifications,
} from "./schema";

export const LEGACY_NOTIFICATIONS_IMPORT = "notifications-state.json";

export type LegacyNotificationsImportResult =
  | { status: "already_imported" }
  | { status: "imported"; notifications: number; preferences: number };

type LegacyState = {
  notifications: InAppNotification[];
  preferencesByUser: Record<string, NotificationPreferences>;
};

function readLegacyState(filePath: string): LegacyState {
  if (!existsSync(filePath)) {
    return { notifications: [], preferencesByUser: {} };
  }

  const parsed = JSON.parse(readFileSync(filePath, "utf8")) as
    Partial<LegacyState>;

  return {
    notifications: Array.isArray(parsed.notifications)
      ? parsed.notifications
      : [],
    preferencesByUser:
      parsed.preferencesByUser && !Array.isArray(parsed.preferencesByUser)
        ? parsed.preferencesByUser
        : {},
  };
}

/**
 * Copies the JSON notifications and per-user email preferences into Postgres
 * once per environment, oldest first. The file store patched missing
 * `metadata` and `readAt` on every read, so the same defaults are applied here
 * — the columns are `not null` and a raw legacy row would be rejected.
 *
 * A missing file is recorded as imported too: there is nothing left to copy.
 */
export async function importLegacyNotifications(
  db: Database,
  filePath: string,
): Promise<LegacyNotificationsImportResult> {
  return db.transaction(async (tx) => {
    const claimed = await tx
      .insert(dataImports)
      .values({ name: LEGACY_NOTIFICATIONS_IMPORT })
      .onConflictDoNothing()
      .returning({ name: dataImports.name });

    if (claimed.length === 0) {
      return { status: "already_imported" };
    }

    const state = readLegacyState(filePath);
    const ordered = [...state.notifications].sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt),
    );

    for (const notification of ordered) {
      await tx
        .insert(notifications)
        .values({
          createdAt: new Date(notification.createdAt),
          id: notification.id,
          linkHref: notification.linkHref ?? "",
          message: notification.message,
          metadata: notification.metadata ?? {},
          readAt: notification.readAt ? new Date(notification.readAt) : null,
          title: notification.title,
          type: notification.type,
          userEmail: notification.userEmail,
        })
        .onConflictDoNothing();
    }

    const preferences = Object.entries(state.preferencesByUser);

    for (const [userEmail, value] of preferences) {
      await tx
        .insert(notificationPreferences)
        .values({ email: value.email, userEmail })
        .onConflictDoNothing();
    }

    return {
      status: "imported",
      notifications: ordered.length,
      preferences: preferences.length,
    };
  });
}
