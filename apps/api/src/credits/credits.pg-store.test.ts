import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { DELETED_ACCOUNT_MARKER, PgCreditLedgerStore } from "./credits.pg-store";

function adminGrant(userEmail: string, amount: number, adminEmail: string) {
  return {
    action: "admin_grant" as const,
    amount,
    metadata: { adminEmail },
    note: "Support",
    type: "admin_grant" as const,
    userEmail,
  };
}

describe("PgCreditLedgerStore", () => {
  let testDatabase: TestDatabase;
  let store: PgCreditLedgerStore;

  beforeAll(async () => {
    testDatabase = await createTestDatabase();
    store = new PgCreditLedgerStore(testDatabase.db);
  });

  afterAll(async () => {
    await testDatabase.close();
  });

  beforeEach(async () => {
    await testDatabase.reset();
  });

  it("reports a zero balance and no history for an unknown user", async () => {
    await expect(store.getBalance("nobody@example.com")).resolves.toBe(0);
    await expect(store.listEntriesForUser("nobody@example.com")).resolves.toEqual([]);
  });

  it("refuses a debit that would make the balance negative", async () => {
    await store.applyEntry(adminGrant("user@example.com", 2, "admin@example.com"));

    await expect(
      store.applyEntry({
        action: "cv_generation",
        amount: -3,
        metadata: {},
        note: "Generation CV",
        type: "ai_usage",
        userEmail: "user@example.com",
      }),
    ).resolves.toEqual({ status: "insufficient_balance", balance: 2 });
    await expect(store.listEntriesForUser("user@example.com")).resolves.toHaveLength(1);
  });

  it("returns the first entry for a reused idempotency key", async () => {
    const first = await store.applyEntry(
      adminGrant("user@example.com", 5, "admin@example.com"),
      "key-1",
    );
    const second = await store.applyEntry(
      adminGrant("user@example.com", 5, "admin@example.com"),
      "key-1",
    );

    expect(first.status).toBe("applied");
    expect(second).toMatchObject({ status: "duplicate" });
    expect(second.status !== "insufficient_balance" && second.entry.id).toBe(
      first.status === "applied" && first.entry.id,
    );
    await expect(store.getBalance("user@example.com")).resolves.toBe(5);
  });

  it("lists, deletes and anonymises admin references", async () => {
    await store.applyEntry(adminGrant("user@example.com", 25, "admin@example.com"));
    await store.applyEntry(adminGrant("admin@example.com", 10, "admin@example.com"));
    await store.applyEntry(adminGrant("other@example.com", 10, "root@example.com"));

    await expect(store.listEntriesByAdminEmail("admin@example.com")).resolves.toHaveLength(2);
    await expect(store.anonymizeAdminReferences("admin@example.com")).resolves.toBe(1);
    await expect(store.deleteByUserEmail("admin@example.com")).resolves.toBe(1);

    const [userEntry] = await store.listEntriesForUser("user@example.com");

    expect(userEntry.metadata.adminEmail).toBe(DELETED_ACCOUNT_MARKER);
    await expect(store.getBalance("admin@example.com")).resolves.toBe(0);
    await expect(store.listEntriesByAdminEmail("admin@example.com")).resolves.toEqual([]);
  });
});
