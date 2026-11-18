import type { JobAlertNotificationOffer } from "@cvforge/types";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApplicationsStore } from "../applications/applications.types";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import type { NotificationsMailerService } from "./notifications-mailer.service";
import { PgNotificationsStore } from "./notifications.pg-store";
import { NotificationsService } from "./notifications.service";
import { JobAlertInbox } from "./job-alert-inbox";

const ADA = "ada@example.com";

function offer(overrides: Partial<JobAlertNotificationOffer> = {}): JobAlertNotificationOffer {
  return {
    companyName: "Doctolib",
    jobId: "ft:123",
    locationLabel: "Nantes",
    sourceLabel: "France Travail",
    title: "Développeur full stack",
    verdict: null,
    ...overrides,
  };
}

let testDatabase: TestDatabase;
let service: NotificationsService;
let inbox: JobAlertInbox;

beforeAll(async () => {
  testDatabase = await createTestDatabase();
  const store = new PgNotificationsStore(testDatabase.db);
  inbox = new JobAlertInbox(store);
  service = new NotificationsService(
    store,
    { listByUserEmail: async () => [] } as unknown as ApplicationsStore,
    { followUpDelayDays: 7 },
    {} as NotificationsMailerService,
  );
});

afterAll(async () => {
  await testDatabase.close();
});

beforeEach(async () => {
  await testDatabase.reset();
  vi.useRealTimers();
});

describe("job alerts in the app (E27)", () => {
  it("names a single offer, why it matches, its source and the verdict, and links to the application", async () => {
    const notification = await inbox.add({
      offers: [offer({ verdict: "seize" })],
      pushed: true,
      reasons: ["vos compétences en React", "télétravail possible"],
      userEmail: ADA,
    });

    expect(notification).toMatchObject({
      linkHref: "/offres-du-jour/postuler/ft%3A123",
      message:
        "Doctolib, Nantes. Pour vos compétences en React, télétravail possible. Source : France Travail. Analyse IA : à saisir.",
      title: "Nouvelle offre : Développeur full stack",
      type: "job_alert",
    });
    expect(notification.metadata).toMatchObject({ matchCount: 1, pushed: true });
  });

  it("counts several offers and names the first three", async () => {
    const notification = await inbox.add({
      offers: ["A", "B", "C", "D", "E"].map((title) => offer({ title })),
      pushed: false,
      reasons: [],
      userEmail: ADA,
    });

    expect(notification.title).toBe("5 nouvelles offres pour vous");
    expect(notification.message).toBe("A · B · C et 2 autre(s).");
    expect(notification.linkHref).toBe("/offres-du-jour");
  });

  it("counts the alerts pushed on a Paris day", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    // 23:30 on the 17th in Paris.
    vi.setSystemTime(new Date("2026-11-17T22:30:00Z"));
    await inbox.add({ offers: [offer()], pushed: true, reasons: [], userEmail: ADA });
    vi.setSystemTime(new Date("2026-11-18T08:00:00Z"));
    await inbox.add({ offers: [offer()], pushed: true, reasons: [], userEmail: ADA });
    await inbox.add({ offers: [offer()], pushed: false, reasons: [], userEmail: ADA });

    expect(await inbox.countPushed(ADA, "2026-11-18")).toBe(1);
    expect(await inbox.countPushed(ADA, "2026-11-17")).toBe(1);
  });

  it("marks every notification read at once", async () => {
    await inbox.add({ offers: [offer()], pushed: false, reasons: [], userEmail: ADA });
    await inbox.add({ offers: [offer()], pushed: false, reasons: [], userEmail: ADA });

    expect(await service.markAllAsRead(ADA)).toBe(2);
    expect((await service.getSummary(ADA)).unreadCount).toBe(0);
    expect(await service.markAllAsRead(ADA)).toBe(0);
  });
});
