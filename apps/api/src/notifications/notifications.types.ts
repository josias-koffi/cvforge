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
};

export type NotificationsListResponse = {
  notifications: InAppNotification[];
};

export type NotificationsSummaryResponse = {
  summary: NotificationSummary;
};

export type NotificationsPreferencesResponse = NotificationPreferencesResponse;
