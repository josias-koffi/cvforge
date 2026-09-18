import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { PgAdminAuditStore, SCRUBBED_TARGET_MARKER } from "./admin-audit.pg-store";
import { AdminAuditService } from "./admin-audit.service";

describe("PgAdminAuditStore", () => {
  let testDatabase: TestDatabase;
  let store: PgAdminAuditStore;

  beforeAll(async () => {
    testDatabase = await createTestDatabase();
    store = new PgAdminAuditStore(testDatabase.db);
  });

  afterAll(async () => {
    await testDatabase.close();
  });

  beforeEach(async () => {
    await testDatabase.reset();
  });

  it("records an entry with its actor, target, note and metadata", async () => {
    await expect(
      store.record({
        action: "credits_granted",
        actorEmail: "admin@example.com",
        metadata: { credits: 50 },
        note: "Geste commercial",
        targetEmail: "user@example.com",
      }),
    ).resolves.toMatchObject({
      action: "credits_granted",
      actorEmail: "admin@example.com",
      metadata: { credits: 50 },
      note: "Geste commercial",
      targetEmail: "user@example.com",
    });
  });

  it("refuses an action outside the known set", async () => {
    await expect(
      store.record({
        action: "account_hijacked" as never,
        actorEmail: "admin@example.com",
        metadata: {},
        note: null,
        targetEmail: "user@example.com",
      }),
    ).rejects.toThrow();
  });

  it("lists newest first, filtered by target and by action", async () => {
    for (const [index, action] of [
      "account_suspended",
      "account_reactivated",
      "role_demoted",
    ].entries()) {
      await store.record({
        action: action as never,
        actorEmail: "admin@example.com",
        metadata: {},
        note: `note-${index}`,
        targetEmail: index === 2 ? "other@example.com" : "user@example.com",
      });
    }

    const all = await store.list({ limit: 10, offset: 0 });
    expect(all.totalItems).toBe(3);
    expect(all.entries[0]?.action).toBe("role_demoted");

    const byTarget = await store.list({
      limit: 10,
      offset: 0,
      targetEmail: "user@example.com",
    });
    expect(byTarget.totalItems).toBe(2);

    const byAction = await store.list({
      action: "account_suspended",
      limit: 10,
      offset: 0,
    });
    expect(byAction.totalItems).toBe(1);
  });

  it("paginates without losing the total", async () => {
    for (let index = 0; index < 5; index += 1) {
      await store.record({
        action: "sessions_revoked",
        actorEmail: "admin@example.com",
        metadata: {},
        note: null,
        targetEmail: `user${index}@example.com`,
      });
    }

    const page = await store.list({ limit: 2, offset: 2 });

    expect(page.entries).toHaveLength(2);
    expect(page.totalItems).toBe(5);
  });

  it("scrubs a deleted target while keeping the action auditable", async () => {
    await store.record({
      action: "account_deleted",
      actorEmail: "admin@example.com",
      metadata: {},
      note: "Demande RGPD",
      targetEmail: "user@example.com",
    });

    await expect(store.scrubTarget("user@example.com")).resolves.toBe(1);

    const { entries } = await store.list({ limit: 10, offset: 0 });
    expect(entries[0]).toMatchObject({
      action: "account_deleted",
      actorEmail: "admin@example.com",
      note: "Demande RGPD",
      targetEmail: SCRUBBED_TARGET_MARKER,
    });
  });
});

describe("AdminAuditService", () => {
  let testDatabase: TestDatabase;
  let service: AdminAuditService;

  beforeAll(async () => {
    testDatabase = await createTestDatabase();
  });

  afterAll(async () => {
    await testDatabase.close();
  });

  beforeEach(async () => {
    await testDatabase.reset();
    service = new AdminAuditService(new PgAdminAuditStore(testDatabase.db));
  });

  it("clamps the page size and ignores an unknown filter", async () => {
    await service.recordSuspension({
      actorEmail: "admin@example.com",
      targetEmail: "user@example.com",
    });

    const page = await service.list({
      action: "not-an-action",
      maxPageSize: 50,
      pageSize: "500",
    });

    expect(page.pagination.pageSize).toBe(50);
    expect(page.filters.action).toBeNull();
    expect(page.entries).toHaveLength(1);
  });

  it("normalizes the target filter and drops a blank note", async () => {
    await service.recordReactivation({
      actorEmail: "admin@example.com",
      note: "   ",
      targetEmail: "user@example.com",
    });

    const page = await service.list({
      maxPageSize: 50,
      targetEmail: "  USER@example.com ",
    });

    expect(page.filters.targetEmail).toBe("user@example.com");
    expect(page.entries[0]?.note).toBeNull();
  });

  it("stamps a demotion with the role that was lost", async () => {
    await service.recordDemotion({
      actorEmail: "admin@example.com",
      targetEmail: "ex-admin@example.com",
    });

    const page = await service.list({ maxPageSize: 50 });

    expect(page.entries[0]).toMatchObject({
      action: "role_demoted",
      metadata: { previousRole: "admin" },
    });
  });

  it("records a credit grant with its amount and mandatory note", async () => {
    await service.recordCreditGrant({
      actorEmail: "admin@example.com",
      credits: 120,
      note: "Compensation incident",
      targetEmail: "user@example.com",
    });

    const page = await service.list({ maxPageSize: 50 });

    expect(page.entries[0]).toMatchObject({
      action: "credits_granted",
      metadata: { credits: 120 },
      note: "Compensation incident",
    });
  });
});
