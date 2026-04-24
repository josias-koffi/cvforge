import type {
  InAppNotification,
  NotificationPreferences,
} from "@cvforge/types";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { NotificationsStore } from "./notifications.types";

type PersistedNotificationsState = {
  notifications: InAppNotification[];
  preferencesByUser: Record<string, NotificationPreferences>;
};

function createEmptyState(): PersistedNotificationsState {
  return {
    notifications: [],
    preferencesByUser: {},
  };
}

function normalizeNotification(
  notification: InAppNotification,
): InAppNotification {
  return {
    ...notification,
    metadata: notification.metadata ?? {},
    readAt: notification.readAt ?? null,
  };
}

export class FileNotificationsStore implements NotificationsStore {
  constructor(private readonly stateFilePath: string) {}

  add(notification: InAppNotification) {
    const state = this.readState();
    const normalized = normalizeNotification(notification);
    state.notifications.push(normalized);
    this.writeState(state);
    return normalized;
  }

  findByIdForUserEmail(userEmail: string, notificationId: string) {
    const state = this.readState();

    return (
      state.notifications.find(
        (notification) =>
          notification.userEmail === userEmail && notification.id === notificationId,
      ) ?? null
    );
  }

  listByUserEmail(userEmail: string) {
    const state = this.readState();

    return state.notifications
      .filter((notification) => notification.userEmail === userEmail)
      .map(normalizeNotification)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  readPreferences(userEmail: string) {
    const state = this.readState();

    return state.preferencesByUser[userEmail] ?? null;
  }

  save(notification: InAppNotification) {
    const state = this.readState();
    const normalized = normalizeNotification(notification);
    const index = state.notifications.findIndex(
      (entry) =>
        entry.userEmail === normalized.userEmail && entry.id === normalized.id,
    );

    if (index === -1) {
      state.notifications.push(normalized);
    } else {
      state.notifications[index] = normalized;
    }

    this.writeState(state);
    return normalized;
  }

  savePreferences(userEmail: string, preferences: NotificationPreferences) {
    const state = this.readState();
    state.preferencesByUser[userEmail] = preferences;
    this.writeState(state);
    return preferences;
  }

  deleteByUserEmail(userEmail: string) {
    const state = this.readState();
    const keptNotifications = state.notifications.filter(
      (notification) => notification.userEmail !== userEmail,
    );
    const removedCount = state.notifications.length - keptNotifications.length;

    state.notifications = keptNotifications;
    this.writeState(state);

    return removedCount;
  }

  private readState(): PersistedNotificationsState {
    if (!existsSync(this.stateFilePath)) {
      return createEmptyState();
    }

    try {
      const parsed = JSON.parse(
        readFileSync(this.stateFilePath, "utf8"),
      ) as Partial<PersistedNotificationsState>;

      return {
        notifications: Array.isArray(parsed.notifications)
          ? parsed.notifications.map((notification) =>
              normalizeNotification(notification),
            )
          : [],
        preferencesByUser:
          parsed.preferencesByUser &&
          typeof parsed.preferencesByUser === "object" &&
          !Array.isArray(parsed.preferencesByUser)
            ? (parsed.preferencesByUser as Record<string, NotificationPreferences>)
            : {},
      };
    } catch {
      return createEmptyState();
    }
  }

  private writeState(state: PersistedNotificationsState) {
    mkdirSync(dirname(this.stateFilePath), { recursive: true });
    writeFileSync(this.stateFilePath, JSON.stringify(state, null, 2));
  }
}
