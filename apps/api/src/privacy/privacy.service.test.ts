import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PgAdminAuditStore } from "../admin/admin-audit.pg-store";
import { PgApplicationsStore } from "../applications/applications.pg-store";
import { PgCreditOrdersStore } from "../billing/credit-orders.pg-store";
import { PgInterviewStore } from "../interview/interview.pg-store";
import { PgAuthAccountStore } from "../auth/auth.pg-store";
import { PgCreditLedgerStore } from "../credits/credits.pg-store";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { PgNotificationsStore } from "../notifications/notifications.pg-store";
import { PgProfilesStore } from "../profiles/profiles.pg-store";
import { createSellableOffer } from "../billing/testing/billing-fixtures";
import { interviewChunks } from "../database/schema";
import { eq, sql } from "drizzle-orm";
import { PrivacyService } from "./privacy.service";

/**
 * Scans every text column of every table for the address. Blunt on purpose:
 * it catches a table nobody remembered to purge, including one added later.
 */
async function findResidualRows(email: string) {
  const columnsResult = (await testDatabase.db.execute(sql`
    select table_name, column_name
      from information_schema.columns
     where table_schema = 'public'
       and data_type in ('text', 'character varying')
  `)) as unknown as {
    rows: Array<{ column_name: string; table_name: string }>;
  };
  const columns = columnsResult.rows;
  const hits: string[] = [];

  for (const { column_name, table_name } of columns) {
    const result = (await testDatabase.db.execute(
      sql.raw(
        `select count(*)::int as total from "${table_name}" where "${column_name}" = '${email}'`,
      ),
    )) as unknown as { rows: Array<{ total: number }> };

    if (Number(result.rows[0]?.total ?? 0) > 0) {
      hits.push(`${table_name}.${column_name}`);
    }
  }

  return hits;
}

let testDatabase: TestDatabase;

beforeAll(async () => {
  testDatabase = await createTestDatabase();
});

afterAll(async () => {
  await testDatabase.close();
});

async function createService() {

  await testDatabase.reset();

  const authStore = new PgAuthAccountStore(testDatabase.db);
  const applicationsStore = new PgApplicationsStore(testDatabase.db);
  const creditsStore = new PgCreditLedgerStore(testDatabase.db);
  const notificationsStore = new PgNotificationsStore(testDatabase.db);
  const profilesStore = new PgProfilesStore(testDatabase.db);
  // Real stores, not mocks: US-092 asks for proof that nothing is left behind,
  // which a stubbed purge cannot give.
  const interviewStore = new PgInterviewStore(testDatabase.db);
  const creditOrdersStore = new PgCreditOrdersStore(testDatabase.db);
  const auditStore = new PgAdminAuditStore(testDatabase.db);

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
  await applicationsStore.createDraft({
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
    auditStore,
    authStore,
    creditOrdersStore,
    creditsStore,
    interviewStore,
    notificationsStore,
    service: new PrivacyService(
      authStore,
      applicationsStore,
      creditsStore,
      notificationsStore,
      profilesStore,
      interviewStore,
      creditOrdersStore,
      auditStore,
    ),
  };
}

describe("PrivacyService", () => {
  it("exports the owned data plus admin references and retention policy", async () => {
    const { service } = await createService();

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
    } = await createService();

    const result = await service.deleteUserData(
      "admin@example.com",
      "admin@example.com",
    );

    expect(result.deletedAuthAccount).toBe(true);
    expect(result.scrubbedThirdPartyReferences).toBe(3);
    await expect(
      authStore.exportUserData("admin@example.com"),
    ).resolves.toMatchObject({ account: null });
    await expect(
      applicationsStore.listByUserEmail("admin@example.com"),
    ).resolves.toEqual([]);
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

  /**
   * US-092: proof, not a claim. Every table that can hold something about the
   * account gets a row, the purge runs, then every table is checked. A new
   * table holding personal data will fail here until the purge covers it.
   */
  it("leaves no residual personal data anywhere after a purge", async () => {
    const {
      applicationsStore,
      auditStore,
      authStore,
      creditOrdersStore,
      creditsStore,
      interviewStore,
      notificationsStore,
      service,
    } = await createService();

    await interviewStore.save({
      durationMinutes: 10,
      startedAt: null,
      context: null,
      aiResponse: null,
      aiResponseGeneratedAt: null,
      aiStatus: "idle",
      applicationId: null,
      chunks: [
        {
          chunkId: "chunk-1",
          createdAt: "2026-04-23T08:00:00.000Z",
          endedAt: "2026-04-23T08:00:05.000Z",
          errorMessage: null,
          isFinal: true,
          mimeType: "audio/webm",
          sequence: 1,
          startedAt: "2026-04-23T08:00:00.000Z",
          status: "transcribed",
          transcript: "Bonjour, je suis ravi de vous rencontrer.",
        },
      ],
      completedAt: null,
      createdAt: "2026-04-23T08:00:00.000Z",
      id: "interview-1",
      language: "fr",
      lastError: null,
      messages: [],
      prefetchedQuestion: null,
      profile: "standard",
      recoverable: false,
      report: null,
      status: "idle",
      transcript: "Bonjour",
      updatedAt: "2026-04-23T08:00:00.000Z",
      userEmail: "user@example.com",
    });

    const offer = await createSellableOffer(testDatabase.db);
    const order = await creditOrdersStore.createPending({
      credits: offer.credits,
      currency: "eur",
      offerId: offer.id,
      offerName: offer.name,
      priceCents: offer.priceCents,
      userEmail: "user@example.com",
    });

    await auditStore.record({
      action: "account_suspended",
      actorEmail: "admin@example.com",
      metadata: {},
      note: "Abus signale",
      targetEmail: "user@example.com",
    });

    // The scan has to be able to fail, or the assertion below proves nothing.
    expect(await findResidualRows("user@example.com")).not.toEqual([]);

    const summary = await service.purgeAccount("user@example.com");

    expect(summary).toMatchObject({
      anonymizedCreditOrders: 1,
      deletedAuthAccount: true,
      deletedInterviewSessions: 1,
    });

    // Nothing left, table by table.
    await expect(
      authStore.exportUserData("user@example.com"),
    ).resolves.toMatchObject({ account: null });
    await expect(
      applicationsStore.listByUserEmail("user@example.com"),
    ).resolves.toEqual([]);
    await expect(
      notificationsStore.listByUserEmail("user@example.com"),
    ).resolves.toEqual([]);
    await expect(
      creditsStore.listEntriesForUser("user@example.com"),
    ).resolves.toEqual([]);
    await expect(interviewStore.findById("interview-1")).resolves.toBeNull();
    await expect(
      creditOrdersStore.listForUser("user@example.com"),
    ).resolves.toEqual([]);

    // The transcript chunks go with their session, via the cascade.
    const chunks = await testDatabase.db
      .select()
      .from(interviewChunks)
      .where(eq(interviewChunks.sessionId, "interview-1"));
    expect(chunks).toEqual([]);

    // The order survives as an accounting record, without the buyer.
    const purgedOrder = await creditOrdersStore.findById(order.id);
    expect(purgedOrder).toMatchObject({
      priceCents: offer.priceCents,
      userEmail: "[deleted-account]",
    });

    // The admin action stays auditable, its target does not stay named.
    const auditPage = await auditStore.list({ limit: 10, offset: 0 });
    expect(auditPage.entries).toHaveLength(1);
    expect(auditPage.entries[0]).toMatchObject({
      action: "account_suspended",
      actorEmail: "admin@example.com",
      targetEmail: "[deleted-account]",
    });

    // Last line of defence: no table mentions the address any more.
    const leftovers = await findResidualRows("user@example.com");
    expect(leftovers).toEqual([]);
  });

  it("rejects mismatched confirmation emails", async () => {
    const { service } = await createService();

    await expect(
      service.deleteUserData("user@example.com", "other@example.com"),
    ).rejects.toThrow(/confirmation email/i);
  });
});
