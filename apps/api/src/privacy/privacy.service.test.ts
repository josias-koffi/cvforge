import { rmSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { FileApplicationsStore } from "../applications/applications.store";
import { PgAuthAccountStore } from "../auth/auth.pg-store";
import { PgCreditLedgerStore } from "../credits/credits.pg-store";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { PgNotificationsStore } from "../notifications/notifications.pg-store";
import { PgProfilesStore } from "../profiles/profiles.pg-store";
import { PrivacyService } from "./privacy.service";

let testDatabase: TestDatabase;

beforeAll(async () => {
  testDatabase = await createTestDatabase();
});

afterAll(async () => {
  await testDatabase.close();
});

async function createService(testId: string) {
  const applicationsPath = `/tmp/${testId}-applications.json`;

  rmSync(applicationsPath, { force: true });
  await testDatabase.reset();

  const authStore = new PgAuthAccountStore(testDatabase.db);
  const applicationsStore = new FileApplicationsStore(applicationsPath);
  const creditsStore = new PgCreditLedgerStore(testDatabase.db);
  const notificationsStore = new PgNotificationsStore(testDatabase.db);
  const profilesStore = new PgProfilesStore(testDatabase.db);

  await authStore.assignInvitedRole(
    "user@example.com",
    "user",
    {
      acceptedAt: "2026-04-23T08:10:10.000Z",
      source: "passwordless",
      version: "2026-04-mvp",
    },
  );
  await authStore.assignInvitedRole(
    "admin@example.com",
    "admin",
    {
      acceptedAt: "2026-04-23T08:10:10.000Z",
      source: "invitation",
      version: "2026-04-mvp",
    },
  );
  await authStore.saveInvitation("invite-1", {
    consumedAt: null,
    createdAt: "2026-04-23T08:00:00.000Z",
    createdBy: "admin@example.com",
    email: "user@example.com",
    expiresAt: "2026-04-25T08:00:00.000Z",
    role: "user",
  });
  applicationsStore.createDraft({
    createdAt: "2026-04-23T08:00:00.000Z",
    cvContent: null,
    cvGeneratedAt: null,
    cvTemplateId: null,
    extracted: {
      companyName: "ACME",
      contractType: null,
      language: "fr",
      location: null,
      requirements: [],
      responsibilities: [],
      salaryRange: null,
      summary: "Resume",
      title: "Product Designer",
    },
    id: "app-1",
    letterContent: null,
    letterGeneratedAt: null,
    letterTemplateId: null,
    offerTextPreview: "Offer preview",
    offerUrl: null,
    rawOfferText: "Offer preview",
    sourceLabel: "Texte colle",
    sourceType: "text",
    status: "draft",
    statusHistory: [
      {
        changedAt: "2026-04-23T08:00:00.000Z",
        status: "draft",
      },
    ],
    updatedAt: "2026-04-23T08:00:00.000Z",
    userEmail: "user@example.com",
  });
  await creditsStore.applyEntry({
    action: "admin_grant",
    amount: 25,
    metadata: {
      adminEmail: "admin@example.com",
    },
    note: "Support commercial",
    type: "admin_grant",
    userEmail: "user@example.com",
  });
  await creditsStore.applyEntry({
    action: "admin_grant",
    amount: 10,
    metadata: {
      adminEmail: "admin@example.com",
    },
    note: "Moderation",
    type: "admin_grant",
    userEmail: "other@example.com",
  });
  await notificationsStore.add({
    createdAt: "2026-04-23T08:30:00.000Z",
    id: "notif-1",
    linkHref: "/candidatures?applicationId=app-1",
    message: "Relancer ACME",
    metadata: {
      applicationId: "app-1",
    },
    readAt: null,
    title: "Relance",
    type: "application_follow_up",
    userEmail: "user@example.com",
  });

  return {
    applicationsStore,
    authStore,
    creditsStore,
    notificationsStore,
    service: new PrivacyService(
      authStore,
      applicationsStore,
      creditsStore,
      notificationsStore,
      profilesStore,
    ),
  };
}

describe("PrivacyService", () => {
  it("exports the owned data plus admin references and retention policy", async () => {
    const { service } = await createService("privacy-export");

    const result = await service.exportUserData("admin@example.com");

    expect(result.userEmail).toBe("admin@example.com");
    expect(result.auth.account?.email).toBe("admin@example.com");
    expect(result.adminGrantReferences).toHaveLength(2);
    expect(result.retentionPolicy.audioPurgePlan.retentionDays).toBe(30);
  });

  it("deletes owned records and scrubs third-party admin references", async () => {
    const {
      applicationsStore,
      authStore,
      creditsStore,
      notificationsStore,
      service,
    } = await createService("privacy-delete");

    const result = await service.deleteUserData(
      "admin@example.com",
      "admin@example.com",
    );

    expect(result.deletedAuthAccount).toBe(true);
    expect(result.scrubbedThirdPartyReferences).toBe(3);
    await expect(
      authStore.exportUserData("admin@example.com"),
    ).resolves.toMatchObject({ account: null });
    expect(applicationsStore.listByUserEmail("admin@example.com")).toEqual([]);
    await expect(
      notificationsStore.listByUserEmail("admin@example.com"),
    ).resolves.toEqual([]);
    await expect(creditsStore.listEntriesByAdminEmail("admin@example.com")).resolves.toHaveLength(0);
    const [otherEntry] = await creditsStore.listEntriesForUser("other@example.com");
    expect(otherEntry?.metadata.adminEmail).toBe("[deleted-account]");
    const userExport = await authStore.exportUserData("user@example.com");
    expect(userExport.receivedInvitations).toHaveLength(1);
    expect(userExport.receivedInvitations[0]?.createdBy).toBe(
      "[deleted-account]",
    );
  });

  it("rejects mismatched confirmation emails", async () => {
    const { service } = await createService("privacy-confirmation");

    await expect(
      service.deleteUserData("user@example.com", "other@example.com"),
    ).rejects.toThrow(/confirmation email/i);
  });
});
