import type {
  InAppNotification,
  NotificationPreferences,
  NotificationPreferencesResponse,
  NotificationSummary,
} from "@cvforge/types";

export type NotificationsConfig = {
  followUpDelayDays: number;
};

/** DI token for the notifications store. */
export const NOTIFICATIONS_STORE = Symbol("NOTIFICATIONS_STORE");

export type NotificationsStore = {
  add: (notification: InAppNotification) => Promise<InAppNotification>;
  findByIdForUserEmail: (
    userEmail: string,
    notificationId: string,
  ) => Promise<InAppNotification | null>;
  listByUserEmail: (userEmail: string) => Promise<InAppNotification[]>;
  readPreferences: (
    userEmail: string,
  ) => Promise<NotificationPreferences | null>;
  save: (notification: InAppNotification) => Promise<InAppNotification>;
  savePreferences: (
    userEmail: string,
    preferences: NotificationPreferences,
  ) => Promise<NotificationPreferences>;
  deleteByUserEmail: (userEmail: string) => Promise<number>;
};

export type NotificationsListResponse = {
  notifications: InAppNotification[];
};

export type NotificationsSummaryResponse = {
  summary: NotificationSummary;
};

export type NotificationsPreferencesResponse = NotificationPreferencesResponse;
