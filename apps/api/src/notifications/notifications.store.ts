import type { InAppNotification } from "@cvforge/types";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { NotificationsStore } from "./notifications.types";

type PersistedNotificationsState = {
  notifications: InAppNotification[];
};

function createEmptyState(): PersistedNotificationsState {
  return {
    notifications: [],
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
