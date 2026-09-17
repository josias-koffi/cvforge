import type {
  InAppNotification,
  NotificationPreferences,
  NotificationPreferencesResponse,
  NotificationSummary,
} from "@cvforge/types";

export type NotificationsConfig = {
  followUpDelayDays: number;
  stateFilePath: string;
};

/** DI token for the notifications store. */
export const NOTIFICATIONS_STORE = Symbol("NOTIFICATIONS_STORE");

export type NotificationsStore = {
  add: (notification: InAppNotification) => InAppNotification;
  findByIdForUserEmail: (
    userEmail: string,
    notificationId: string,
  ) => InAppNotification | null;
  listByUserEmail: (userEmail: string) => InAppNotification[];
  readPreferences: (userEmail: string) => NotificationPreferences | null;
  save: (notification: InAppNotification) => InAppNotification;
  savePreferences: (
    userEmail: string,
    preferences: NotificationPreferences,
  ) => NotificationPreferences;
  deleteByUserEmail: (userEmail: string) => number;
};

export type NotificationsListResponse = {
  notifications: InAppNotification[];
};

export type NotificationsSummaryResponse = {
  summary: NotificationSummary;
};

export type NotificationsPreferencesResponse = NotificationPreferencesResponse;
