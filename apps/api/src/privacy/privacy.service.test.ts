import { rmSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FileApplicationsStore } from "../applications/applications.store";
import { FileAuthAccountStore } from "../auth/auth-account-store";
import { FileCreditLedgerStore } from "../credits/credits.store";
import { FileNotificationsStore } from "../notifications/notifications.store";
import { FileProfilesStore } from "../profiles/profiles.store";
import { PrivacyService } from "./privacy.service";

function createService(testId: string) {
  const authPath = `/tmp/${testId}-auth.json`;
  const applicationsPath = `/tmp/${testId}-applications.json`;
  const creditsPath = `/tmp/${testId}-credits.json`;
  const notificationsPath = `/tmp/${testId}-notifications.json`;
  const profilesPath = `/tmp/${testId}-profiles.json`;

  rmSync(authPath, { force: true });
  rmSync(applicationsPath, { force: true });
  rmSync(creditsPath, { force: true });
  rmSync(notificationsPath, { force: true });
  rmSync(profilesPath, { force: true });

  const authStore = new FileAuthAccountStore(authPath);
  const applicationsStore = new FileApplicationsStore(applicationsPath);
  const creditsStore = new FileCreditLedgerStore(creditsPath);
  const notificationsStore = new FileNotificationsStore(notificationsPath);
  const profilesStore = new FileProfilesStore(profilesPath);

  authStore.assignInvitedRole(
    "user@example.com",
    "user",
    {
      acceptedAt: "2026-04-23T08:10:10.000Z",
      source: "passwordless",
      version: "2026-04-mvp",
    },
  );
  authStore.assignInvitedRole(
    "admin@example.com",
    "admin",
    {
      acceptedAt: "2026-04-23T08:10:10.000Z",
      source: "invitation",
      version: "2026-04-mvp",
    },
  );
  authStore.saveInvitation("invite-1", {
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
  creditsStore.addEntry({
    action: "admin_grant",
    amount: 25,
    balanceAfter: 25,
    createdAt: "2026-04-23T08:00:00.000Z",
    id: "credit-1",
    metadata: {
      adminEmail: "admin@example.com",
    },
    note: "Support commercial",
    type: "admin_grant",
    userEmail: "user@example.com",
  });
  creditsStore.addEntry({
    action: "admin_grant",
    amount: 10,
    balanceAfter: 10,
    createdAt: "2026-04-23T09:00:00.000Z",
    id: "credit-2",
    metadata: {
      adminEmail: "admin@example.com",
    },
    note: "Moderation",
    type: "admin_grant",
    userEmail: "other@example.com",
  });
  notificationsStore.add({
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
  it("exports the owned data plus admin references and retention policy", () => {
    const { service } = createService("privacy-export");

    const result = service.exportUserData("admin@example.com");

    expect(result.userEmail).toBe("admin@example.com");
    expect(result.auth.account?.email).toBe("admin@example.com");
    expect(result.adminGrantReferences).toHaveLength(2);
    expect(result.retentionPolicy.audioPurgePlan.retentionDays).toBe(30);
  });

  it("deletes owned records and scrubs third-party admin references", () => {
    const {
      applicationsStore,
      authStore,
      creditsStore,
      notificationsStore,
      service,
    } = createService("privacy-delete");

    const result = service.deleteUserData(
      "admin@example.com",
      "admin@example.com",
    );

    expect(result.deletedAuthAccount).toBe(true);
    expect(result.scrubbedThirdPartyReferences).toBe(3);
    expect(authStore.exportUserData("admin@example.com").account).toBeNull();
    expect(applicationsStore.listByUserEmail("admin@example.com")).toEqual([]);
    expect(notificationsStore.listByUserEmail("admin@example.com")).toEqual([]);
    expect(creditsStore.listEntriesByAdminEmail("admin@example.com")).toHaveLength(0);
    expect(creditsStore.listEntriesForUser("other@example.com")[0]?.metadata.adminEmail).toBe(
      "[deleted-account]",
    );
    expect(authStore.exportUserData("user@example.com").receivedInvitations).toHaveLength(1);
    expect(
      authStore.exportUserData("user@example.com").receivedInvitations[0]?.createdBy,
    ).toBe("[deleted-account]");
  });

  it("rejects mismatched confirmation emails", () => {
    const { service } = createService("privacy-confirmation");

    expect(() =>
      service.deleteUserData("user@example.com", "other@example.com"),
    ).toThrow(/confirmation email/i);
  });
});
