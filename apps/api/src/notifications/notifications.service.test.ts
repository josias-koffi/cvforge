import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  APPLICATION_STATUS_SENT,
  APPLICATION_SOURCE_URL,
  NOTIFICATION_TYPE_APPLICATION_FOLLOW_UP,
  type InAppNotification,
} from "@cvforge/types";
import type { NotificationsMailerService } from "./notifications-mailer.service";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { PgNotificationsStore } from "./notifications.pg-store";
import { NotificationsService } from "./notifications.service";
import type { NotificationsConfig } from "./notifications.types";
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

let testDatabase: TestDatabase;
let notificationsStore: PgNotificationsStore;

/** Seeds the real Postgres-backed store, empty between tests. */
async function createNotificationsStore(initial: InAppNotification[] = []) {
  for (const notification of initial) {
    await notificationsStore.add(notification);
  }

  return notificationsStore;
}

function createApplicationsStore(
  applications: StoredApplication[],
): ApplicationsStore {
  return {
    async createDraft(application) {
      return application;
    },
    async deleteByUserEmail() {
      return 0;
    },
    async findById() {
      return null;
    },
    async findByIdForUserEmail() {
      return null;
    },
    async listAll() {
      return applications;
    },
    async listByUserEmail(userEmail) {
      return applications.filter((application) => application.userEmail === userEmail);
    },
    async save(application) {
      return application;
    },
  };
}

describe("NotificationsService", () => {
  const config: NotificationsConfig = {
    followUpDelayDays: 7,
  };
  const notificationsMailer = {
    getDeliveryStatus: vi.fn(() => ({
      provider: "resend",
      ready: true,
    })),
    sendApplicationFollowUpEmail: vi.fn(),
    sendCreditPurchaseConfirmationEmail: vi.fn(),
  } as unknown as NotificationsMailerService;

  beforeAll(async () => {
    testDatabase = await createTestDatabase();
    notificationsStore = new PgNotificationsStore(testDatabase.db);
  });

  afterAll(async () => {
    await testDatabase.close();
  });

  beforeEach(async () => {
    await testDatabase.reset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-22T08:00:00.000Z"));
    vi.mocked(notificationsMailer.sendApplicationFollowUpEmail).mockReset();
    vi.mocked(notificationsMailer.sendCreditPurchaseConfirmationEmail).mockReset();
  });

  it("creates a single J+7 follow-up reminder for sent applications without response", async () => {
    const service = new NotificationsService(
      await createNotificationsStore(),
      createApplicationsStore([createApplication()]),
      config,
      notificationsMailer,
    );

    const notifications = await service.listNotifications("user@example.com");

    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.type).toBe(NOTIFICATION_TYPE_APPLICATION_FOLLOW_UP);
    expect(notifications[0]?.metadata.applicationId).toBe("app-001");
    expect(notifications[0]?.createdAt).toBe("2026-04-17T08:00:00.000Z");
    expect(notificationsMailer.sendApplicationFollowUpEmail).toHaveBeenCalledTimes(1);
  });

  it("does not duplicate reminders when listing multiple times", async () => {
    const store = await createNotificationsStore();
    const service = new NotificationsService(
      store,
      createApplicationsStore([createApplication()]),
      config,
      notificationsMailer,
    );

    await service.listNotifications("user@example.com");
    const notifications = await service.listNotifications("user@example.com");

    expect(notifications).toHaveLength(1);
    expect(notificationsMailer.sendApplicationFollowUpEmail).toHaveBeenCalledTimes(1);
  });

  it("marks notifications as read and updates the unread summary", async () => {
    const store = await createNotificationsStore();
    const service = new NotificationsService(
      store,
      createApplicationsStore([createApplication()]),
      config,
      notificationsMailer,
    );

    const [notification] = await service.listNotifications("user@example.com");

    await expect(service.getSummary("user@example.com")).resolves.toEqual({
      unreadCount: 1,
    });

    const updated = await service.markAsRead("user@example.com", notification!.id);

    expect(updated.readAt).toBe("2026-04-22T08:00:00.000Z");
    await expect(service.getSummary("user@example.com")).resolves.toEqual({
      unreadCount: 0,
    });
  });

  it("persists notification preferences per user", async () => {
    const service = new NotificationsService(
      await createNotificationsStore(),
      createApplicationsStore([createApplication()]),
      config,
      notificationsMailer,
    );

    const updated = await service.updatePreferences("user@example.com", {
      applicationFollowUp: false,
    });

    expect(updated.preferences.email.applicationFollowUp).toBe(false);
    expect(updated.preferences.email.creditPurchaseConfirmed).toBe(true);
    await expect(service.getPreferences("user@example.com")).resolves.toMatchObject(
      { provider: "resend" },
    );
  });

  it("skips follow-up email delivery when the user disabled that preference", async () => {
    const store = await createNotificationsStore();
    await store.savePreferences("user@example.com", {
      email: {
        applicationFollowUp: false,
        creditPurchaseConfirmed: true,
      },
    });
    const service = new NotificationsService(
      store,
      createApplicationsStore([createApplication()]),
      config,
      notificationsMailer,
    );

    await service.listNotifications("user@example.com");

    expect(notificationsMailer.sendApplicationFollowUpEmail).not.toHaveBeenCalled();
  });
});
