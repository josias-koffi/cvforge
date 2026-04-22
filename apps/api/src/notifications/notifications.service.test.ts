import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  APPLICATION_STATUS_SENT,
  APPLICATION_SOURCE_URL,
  NOTIFICATION_TYPE_APPLICATION_FOLLOW_UP,
  type InAppNotification,
} from "@cvforge/types";
import { NotificationsService } from "./notifications.service";
import type {
  NotificationsConfig,
  NotificationsStore,
} from "./notifications.types";
import type {
  ApplicationsStore,
  StoredApplication,
} from "../applications/applications.types";

function createApplication(overrides: Partial<StoredApplication> = {}): StoredApplication {
  return {
    createdAt: "2026-04-10T08:00:00.000Z",
    cvContent: null,
    cvGeneratedAt: null,
    cvTemplateId: null,
    extracted: {
      companyName: "Acme",
      contractType: null,
      language: "fr",
      location: "Paris",
      requirements: [],
      responsibilities: [],
      salaryRange: null,
      summary: "Resume",
      title: "Product Engineer",
    },
    id: "app-001",
    letterContent: null,
    letterGeneratedAt: null,
    letterTemplateId: null,
    offerTextPreview: "Preview",
    offerUrl: "https://example.com/jobs/1",
    rawOfferText: "Long offer text",
    sourceLabel: "Acme",
    sourceType: APPLICATION_SOURCE_URL,
    status: APPLICATION_STATUS_SENT,
    statusHistory: [
      {
        changedAt: "2026-04-10T08:00:00.000Z",
        status: APPLICATION_STATUS_SENT,
      },
    ],
    updatedAt: "2026-04-10T08:00:00.000Z",
    userEmail: "user@example.com",
    ...overrides,
  };
}

function createNotificationsStore(initial: InAppNotification[] = []): NotificationsStore {
  const notifications = [...initial];

  return {
    add(notification) {
      notifications.push(notification);
      return notification;
    },
    findByIdForUserEmail(userEmail, notificationId) {
      return (
        notifications.find(
          (notification) =>
            notification.userEmail === userEmail && notification.id === notificationId,
        ) ?? null
      );
    },
    listByUserEmail(userEmail) {
      return notifications.filter((notification) => notification.userEmail === userEmail);
    },
    save(notification) {
      const index = notifications.findIndex((entry) => entry.id === notification.id);

      if (index === -1) {
        notifications.push(notification);
      } else {
        notifications[index] = notification;
      }

      return notification;
    },
  };
}

function createApplicationsStore(
  applications: StoredApplication[],
): ApplicationsStore {
  return {
    createDraft(application) {
      return application;
    },
    findById() {
      return null;
    },
    findByIdForUserEmail() {
      return null;
    },
    listAll() {
      return applications;
    },
    listByUserEmail(userEmail) {
      return applications.filter((application) => application.userEmail === userEmail);
    },
    save(application) {
      return application;
    },
  };
}

describe("NotificationsService", () => {
  const config: NotificationsConfig = {
    followUpDelayDays: 7,
    stateFilePath: "/tmp/notifications-state.json",
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-22T08:00:00.000Z"));
  });

  it("creates a single J+7 follow-up reminder for sent applications without response", () => {
    const service = new NotificationsService(
      createNotificationsStore(),
      createApplicationsStore([createApplication()]),
      config,
    );

    const notifications = service.listNotifications("user@example.com");

    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.type).toBe(NOTIFICATION_TYPE_APPLICATION_FOLLOW_UP);
    expect(notifications[0]?.metadata.applicationId).toBe("app-001");
    expect(notifications[0]?.createdAt).toBe("2026-04-17T08:00:00.000Z");
  });

  it("does not duplicate reminders when listing multiple times", () => {
    const store = createNotificationsStore();
    const service = new NotificationsService(
      store,
      createApplicationsStore([createApplication()]),
      config,
    );

    service.listNotifications("user@example.com");
    const notifications = service.listNotifications("user@example.com");

    expect(notifications).toHaveLength(1);
  });

  it("marks notifications as read and updates the unread summary", () => {
    const store = createNotificationsStore();
    const service = new NotificationsService(
      store,
      createApplicationsStore([createApplication()]),
      config,
    );

    const [notification] = service.listNotifications("user@example.com");

    expect(service.getSummary("user@example.com")).toEqual({ unreadCount: 1 });

    const updated = service.markAsRead("user@example.com", notification!.id);

    expect(updated.readAt).toBe("2026-04-22T08:00:00.000Z");
    expect(service.getSummary("user@example.com")).toEqual({ unreadCount: 0 });
  });
});
