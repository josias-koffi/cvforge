import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { authAccounts, creditLedgerEntries } from "../database/schema";
import { PgCreditLedgerStore } from "../credits/credits.pg-store";
import { AdminUsersService } from "./admin-users.service";
import { PgAdminUsersStore } from "./admin-users.pg-store";

const DAY = 86_400_000;
const NOW = Date.parse("2026-09-17T12:00:00.000Z");

describe("PgAdminUsersStore", () => {
  let testDatabase: TestDatabase;
  let store: PgAdminUsersStore;
  let ledger: PgCreditLedgerStore;

  beforeAll(async () => {
    testDatabase = await createTestDatabase();
    store = new PgAdminUsersStore(testDatabase.db);
    ledger = new PgCreditLedgerStore(testDatabase.db);
  });

  afterAll(async () => {
    await testDatabase.close();
  });

  beforeEach(async () => {
    await testDatabase.reset();
  });

  async function addAccount(
    email: string,
    overrides: { createdAt?: Date; role?: "admin" | "user"; status?: string } = {},
  ) {
    await testDatabase.db.insert(authAccounts).values({
      createdAt: overrides.createdAt ?? new Date(NOW - 10 * DAY),
      email,
      role: overrides.role ?? "user",
      status: (overrides.status ?? "active") as never,
    });
  }

  async function grantCredits(email: string, amount: number, createdAt?: Date) {
    await ledger.applyEntry({
      action: "admin_grant",
      amount,
      metadata: { adminEmail: "admin@example.com" },
      note: "Credit initial",
      type: "admin_grant",
      userEmail: email,
    });

    if (createdAt) {
      await testDatabase.db.update(creditLedgerEntries).set({ createdAt });
    }
  }

  const list = (filters = {}, limit = 10, offset = 0) =>
    store.listDirectory({ filters, limit, offset });

  it("returns an account with no ledger row at all", async () => {
    await addAccount("fresh@example.com");

    const { rows, totalItems } = await list();

    expect(totalItems).toBe(1);
    expect(rows[0]).toMatchObject({
      balance: 0,
      email: "fresh@example.com",
      lastManualGrant: null,
      ledgerEntryCount: 0,
      status: "active",
    });
    // With no activity, the account's own creation date is the fallback.
    expect(rows[0]?.lastActivityAt).toBe(new Date(NOW - 10 * DAY).toISOString());
  });

  it("reports the balance, the entry count and the last manual grant", async () => {
    await addAccount("user@example.com");
    await grantCredits("user@example.com", 50);
    await grantCredits("user@example.com", 70);

    const { rows } = await list();

    expect(rows[0]).toMatchObject({
      balance: 120,
      ledgerEntryCount: 2,
    });
    expect(rows[0]?.lastManualGrant).toMatchObject({
      adminEmail: "admin@example.com",
      amount: 70,
    });
  });

  it("filters by role, by status and by email substring", async () => {
    await addAccount("admin@example.com", { role: "admin" });
    await addAccount("alice@example.com");
    await addAccount("bob@example.com", { status: "suspended" });

    await expect(list({ role: "admin" })).resolves.toMatchObject({ totalItems: 1 });
    await expect(list({ status: "suspended" })).resolves.toMatchObject({
      totalItems: 1,
    });
    await expect(list({ query: "ali" })).resolves.toMatchObject({ totalItems: 1 });
    await expect(list({ query: "example.com" })).resolves.toMatchObject({
      totalItems: 3,
    });
  });

  it("filters by balance band, counting a missing balance row as empty", async () => {
    await addAccount("empty@example.com");
    await addAccount("low@example.com");
    await addAccount("stocked@example.com");
    await grantCredits("low@example.com", 5);
    await grantCredits("stocked@example.com", 400);

    await expect(list({ balance: "empty" })).resolves.toMatchObject({
      totalItems: 1,
    });
    await expect(list({ balance: "low" })).resolves.toMatchObject({ totalItems: 1 });
    await expect(list({ balance: "stocked" })).resolves.toMatchObject({
      totalItems: 1,
    });
  });

  it("combines filters instead of replacing them", async () => {
    await addAccount("admin@example.com", { role: "admin" });
    await addAccount("suspended-admin@example.com", {
      role: "admin",
      status: "suspended",
    });

    await expect(
      list({ role: "admin", status: "suspended" }),
    ).resolves.toMatchObject({ totalItems: 1 });
  });

  it("paginates in SQL while reporting the unpaginated total", async () => {
    for (let index = 0; index < 5; index += 1) {
      await addAccount(`user${index}@example.com`);
    }

    const page = await list({}, 2, 2);

    expect(page.rows).toHaveLength(2);
    expect(page.totalItems).toBe(5);
  });

  it("orders by last activity, then email", async () => {
    await addAccount("quiet@example.com", { createdAt: new Date(NOW - 30 * DAY) });
    await addAccount("busy@example.com", { createdAt: new Date(NOW - 30 * DAY) });
    await grantCredits("busy@example.com", 10);

    const { rows } = await list();

    expect(rows.map(({ email }) => email)).toEqual([
      "busy@example.com",
      "quiet@example.com",
    ]);
  });
});

describe("AdminUsersService", () => {
  let testDatabase: TestDatabase;
  let service: AdminUsersService;

  beforeAll(async () => {
    testDatabase = await createTestDatabase();
  });

  afterAll(async () => {
    await testDatabase.close();
  });

  beforeEach(async () => {
    await testDatabase.reset();
    service = new AdminUsersService(new PgAdminUsersStore(testDatabase.db));

    for (let index = 0; index < 5; index += 1) {
      await testDatabase.db.insert(authAccounts).values({
        email: `user${index}@example.com`,
        role: "user",
      });
    }
  });

  it("echoes the applied filters, normalising an unknown value to all", async () => {
    const page = await service.listDirectory({
      balance: "weird",
      maxPageSize: 100,
      query: "  USER1 ",
      role: "superuser",
      status: "banned",
    });

    expect(page.filters).toEqual({
      balance: "all",
      query: "USER1",
      role: "all",
      status: "all",
    });
    // The query itself is still applied, lowercased.
    expect(page.pagination.totalItems).toBe(1);
  });

  it("caps the page size at the controller's maximum", async () => {
    const page = await service.listDirectory({ maxPageSize: 3, pageSize: "500" });

    expect(page.pagination.pageSize).toBe(3);
    expect(page.users).toHaveLength(3);
  });

  it("clamps a page past the end rather than answering an empty table", async () => {
    const page = await service.listDirectory({
      maxPageSize: 100,
      page: "99",
      pageSize: "2",
    });

    expect(page.pagination.page).toBe(3);
    expect(page.pagination.totalPages).toBe(3);
    expect(page.users).toHaveLength(1);
  });
});
