import { NOTIFICATION_TYPE_APPLICATION_FOLLOW_UP } from "@cvforge/types";
import type { InAppNotification } from "@cvforge/types";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { PgNotificationsStore } from "./notifications.pg-store";

let testDatabase: TestDatabase;
let store: PgNotificationsStore;

function makeNotification(
  id: string,
  overrides: Partial<InAppNotification> = {},
): InAppNotification {
  return {
    createdAt: "2026-04-22T08:00:00.000Z",
    id,
    linkHref: "/candidatures?applicationId=app-1",
    message: "Pensez a relancer.",
    metadata: { applicationId: "app-1" },
    readAt: null,
    title: "Relancer Acme",
    type: NOTIFICATION_TYPE_APPLICATION_FOLLOW_UP,
    userEmail: "user@example.com",
    ...overrides,
  };
}

describe("PgNotificationsStore", () => {
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

  it("round-trips a notification", async () => {
    const added = await store.add(makeNotification("n-1"));

    expect(added).toEqual(makeNotification("n-1"));
    await expect(
      store.findByIdForUserEmail("user@example.com", "n-1"),
    ).resolves.toEqual(makeNotification("n-1"));
  });

  it("keeps notifications scoped to their owner", async () => {
    await store.add(makeNotification("n-1"));

    await expect(
      store.findByIdForUserEmail("other@example.com", "n-1"),
    ).resolves.toBeNull();
    await expect(store.listByUserEmail("other@example.com")).resolves.toEqual(
      [],
    );
  });

  it("lists newest first", async () => {
    await store.add(
      makeNotification("old", { createdAt: "2026-04-20T08:00:00.000Z" }),
    );
    await store.add(
      makeNotification("new", { createdAt: "2026-04-24T08:00:00.000Z" }),
    );

    const ids = (await store.listByUserEmail("user@example.com")).map(
      ({ id }) => id,
    );

    expect(ids).toEqual(["new", "old"]);
  });

  it("marks a notification read through save", async () => {
    await store.add(makeNotification("n-1"));

    const saved = await store.save(
      makeNotification("n-1", { readAt: "2026-04-25T09:00:00.000Z" }),
    );

    expect(saved.readAt).toBe("2026-04-25T09:00:00.000Z");
    await expect(store.listByUserEmail("user@example.com")).resolves.toHaveLength(
      1,
    );
  });

  it("returns null preferences until some are saved", async () => {
    await expect(
      store.readPreferences("user@example.com"),
    ).resolves.toBeNull();

    await store.savePreferences("user@example.com", {
      email: { applicationFollowUp: false, creditPurchaseConfirmed: true, jobDigest: true },
    });

    await expect(store.readPreferences("user@example.com")).resolves.toEqual({
      email: { applicationFollowUp: false, creditPurchaseConfirmed: true, jobDigest: true },
    });
  });

  it("overwrites preferences on a second save", async () => {
    await store.savePreferences("user@example.com", {
      email: { applicationFollowUp: false, creditPurchaseConfirmed: true, jobDigest: true },
    });
    await store.savePreferences("user@example.com", {
      email: { applicationFollowUp: true, creditPurchaseConfirmed: false, jobDigest: true },
    });

    await expect(store.readPreferences("user@example.com")).resolves.toEqual({
      email: { applicationFollowUp: true, creditPurchaseConfirmed: false, jobDigest: true },
    });
  });

  it("purges an account's notifications and its preferences", async () => {
    await store.add(makeNotification("n-1"));
    await store.add(makeNotification("n-2"));
    await store.add(
      makeNotification("other", { userEmail: "other@example.com" }),
    );
    await store.savePreferences("user@example.com", {
      email: { applicationFollowUp: false, creditPurchaseConfirmed: false, jobDigest: true },
    });

    await expect(store.deleteByUserEmail("user@example.com")).resolves.toBe(2);

    await expect(store.listByUserEmail("user@example.com")).resolves.toEqual([]);
    await expect(store.readPreferences("user@example.com")).resolves.toBeNull();
    await expect(
      store.listByUserEmail("other@example.com"),
    ).resolves.toHaveLength(1);
  });
});
