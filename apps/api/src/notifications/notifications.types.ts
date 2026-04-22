import type { InAppNotification, NotificationSummary } from "@cvforge/types";

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
  save: (notification: InAppNotification) => InAppNotification;
};

export type NotificationsListResponse = {
  notifications: InAppNotification[];
};

export type NotificationsSummaryResponse = {
  summary: NotificationSummary;
};
