import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PgNotificationsStore } from "../notifications/notifications.pg-store";
import { importLegacyNotifications } from "./import-legacy-notifications";
import { createTestDatabase, type TestDatabase } from "./testing/test-database";

function legacyNotification(id: string, overrides: Record<string, unknown> = {}) {
  return {
    createdAt: "2026-04-22T08:00:00.000Z",
    id,
    linkHref: "/candidatures?applicationId=app-1",
    message: "Pensez a relancer.",
    metadata: { applicationId: "app-1" },
    readAt: null,
    title: "Relancer Acme",
    type: "application_follow_up",
    userEmail: "user@example.com",
    ...overrides,
  };
}

describe("importLegacyNotifications", () => {
  let testDatabase: TestDatabase;
  let store: PgNotificationsStore;
  const directory = mkdtempSync(join(tmpdir(), "cvforge-legacy-notifications-"));
  let fileCounter = 0;

  function writeState(state: Record<string, unknown>) {
    const filePath = join(directory, `state-${(fileCounter += 1)}.json`);

    writeFileSync(filePath, JSON.stringify(state));

    return filePath;
  }

  beforeAll(async () => {
    testDatabase = await createTestDatabase();
    store = new PgNotificationsStore(testDatabase.db);
  });

  afterAll(async () => {
    await testDatabase.close();
  });

  beforeEach(async () => {
    await testDatabase.reset();
  });

  it("records a missing file as imported, with nothing to copy", async () => {
    const result = await importLegacyNotifications(
      testDatabase.db,
      join(directory, "does-not-exist.json"),
    );

    expect(result).toEqual({
      status: "imported",
      notifications: 0,
      preferences: 0,
    });
  });

  it("copies notifications and preferences in", async () => {
    const filePath = writeState({
      notifications: [
        legacyNotification("n-1"),
        legacyNotification("n-2", {
          readAt: "2026-04-23T09:00:00.000Z",
          userEmail: "other@example.com",
        }),
      ],
      preferencesByUser: {
        "user@example.com": {
          email: { applicationFollowUp: false, creditPurchaseConfirmed: true },
        },
      },
    });

    const result = await importLegacyNotifications(testDatabase.db, filePath);

    expect(result).toEqual({
      status: "imported",
      notifications: 2,
      preferences: 1,
    });
    await expect(store.listByUserEmail("user@example.com")).resolves.toHaveLength(
      1,
    );
    await expect(store.readPreferences("user@example.com")).resolves.toEqual({
      email: { applicationFollowUp: false, creditPurchaseConfirmed: true },
    });
    const [read] = await store.listByUserEmail("other@example.com");
    expect(read?.readAt).toBe("2026-04-23T09:00:00.000Z");
  });

  it("runs once per environment", async () => {
    const filePath = writeState({
      notifications: [legacyNotification("n-1")],
      preferencesByUser: {},
    });

    await importLegacyNotifications(testDatabase.db, filePath);
    const second = await importLegacyNotifications(testDatabase.db, filePath);

    expect(second).toEqual({ status: "already_imported" });
    await expect(store.listByUserEmail("user@example.com")).resolves.toHaveLength(
      1,
    );
  });

  it("applies the defaults the file store patched in on read", async () => {
    // `metadata` and `linkHref` are absent here, as in the oldest records;
    // both columns are `not null`.
    const filePath = writeState({
      notifications: [
        {
          createdAt: "2026-04-22T08:00:00.000Z",
          id: "bare",
          message: "Message",
          title: "Titre",
          type: "application_follow_up",
          userEmail: "user@example.com",
        },
      ],
    });

    await importLegacyNotifications(testDatabase.db, filePath);

    await expect(
      store.findByIdForUserEmail("user@example.com", "bare"),
    ).resolves.toMatchObject({
      linkHref: "",
      metadata: {},
      readAt: null,
    });
  });

  it("fails loudly on a corrupted file instead of importing nothing", async () => {
    // The file store swallowed parse errors and returned an empty state, which
    // would silently drop every notification here. `migrate.main` exits
    // non-zero on a throw, so the rollout stops with the data still on disk.
    const filePath = join(directory, "corrupted.json");

    writeFileSync(filePath, "{ not json");

    await expect(
      importLegacyNotifications(testDatabase.db, filePath),
    ).rejects.toThrow();
  });
});
