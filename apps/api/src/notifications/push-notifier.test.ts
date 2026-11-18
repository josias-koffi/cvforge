import { WebPushError } from "web-push";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { PgNotificationsStore } from "./notifications.pg-store";
import { PushNotifier, resolvePushConfig } from "./push-notifier";
import { readPushSubscription } from "./push-subscription-input";
import { PgPushSubscriptionsStore } from "./push-subscriptions.pg-store";

const CONFIG = { privateKey: "private", publicKey: "public", subject: "mailto:a@b.fr" };
const PAYLOAD = { body: "Doctolib, Nantes", tag: "job-alert", title: "Nouvelle offre", url: "/offres-du-jour" };

function subscription(id: string) {
  return {
    endpoint: `https://fcm.googleapis.com/fcm/send/${id}`,
    keys: { auth: `auth-${id}`, p256dh: `key-${id}` },
  };
}

let testDatabase: TestDatabase;
let store: PgPushSubscriptionsStore;

beforeAll(async () => {
  testDatabase = await createTestDatabase();
  store = new PgPushSubscriptionsStore(testDatabase.db);
});

afterAll(async () => {
  await testDatabase.close();
});

beforeEach(async () => {
  await testDatabase.reset();
});

describe("PgPushSubscriptionsStore", () => {
  it("keeps one row per browser, owned by the last account that subscribed it", async () => {
    await store.save("ada@example.com", subscription("1"));
    await store.save("grace@example.com", subscription("1"));

    expect(await store.listByUserEmail("ada@example.com")).toEqual([]);
    expect(await store.listByUserEmail("grace@example.com")).toEqual([
      subscription("1"),
    ]);
  });

  it("only lets its owner remove a browser", async () => {
    await store.save("ada@example.com", subscription("1"));

    await store.remove("grace@example.com", subscription("1").endpoint);
    expect(await store.listByUserEmail("ada@example.com")).toHaveLength(1);

    await store.remove("ada@example.com", subscription("1").endpoint);
    expect(await store.listByUserEmail("ada@example.com")).toEqual([]);
  });

  it("goes with the account", async () => {
    await store.save("ada@example.com", subscription("1"));

    await new PgNotificationsStore(testDatabase.db).deleteByUserEmail(
      "ada@example.com",
    );

    expect(await store.listByUserEmail("ada@example.com")).toEqual([]);
  });
});

describe("PushNotifier", () => {
  it("does nothing without VAPID keys", async () => {
    await store.save("ada@example.com", subscription("1"));
    const notifier = new PushNotifier(store, null);

    expect(notifier.publicKey).toBeNull();
    expect(await notifier.notify("ada@example.com", PAYLOAD)).toBe(0);
  });

  it("pushes to every browser of the candidate", async () => {
    await store.save("ada@example.com", subscription("1"));
    await store.save("ada@example.com", subscription("2"));
    const send = vi.fn(async () => {});

    const delivered = await new PushNotifier(store, CONFIG, send).notify(
      "ada@example.com",
      PAYLOAD,
    );

    expect(delivered).toBe(2);
    expect(send).toHaveBeenCalledWith(subscription("1"), JSON.stringify(PAYLOAD));
  });

  it("forgets a browser the push service says is gone, keeps one that failed once", async () => {
    await store.save("ada@example.com", subscription("gone"));
    await store.save("ada@example.com", subscription("flaky"));
    const send = vi.fn(async (target: { endpoint: string }) => {
      if (target.endpoint.endsWith("gone")) {
        throw new WebPushError("Gone", 410, {}, "", target.endpoint);
      }
      throw new Error("Socket timeout");
    });

    const delivered = await new PushNotifier(store, CONFIG, send).notify(
      "ada@example.com",
      PAYLOAD,
    );

    expect(delivered).toBe(0);
    expect(await store.listByUserEmail("ada@example.com")).toEqual([
      subscription("flaky"),
    ]);
  });
});

describe("resolvePushConfig", () => {
  it("needs both keys", () => {
    expect(resolvePushConfig({ VAPID_PUBLIC_KEY: "x" })).toBeNull();
    expect(
      resolvePushConfig({
        VAPID_PRIVATE_KEY: "y",
        VAPID_PUBLIC_KEY: "x",
        VAPID_SUBJECT: "mailto:contact@jobspark.fr",
      }),
    ).toEqual({
      privateKey: "y",
      publicKey: "x",
      subject: "mailto:contact@jobspark.fr",
    });
  });
});

describe("readPushSubscription", () => {
  it("accepts what a browser sends", () => {
    expect(readPushSubscription(subscription("1"))).toEqual(subscription("1"));
  });

  it("refuses anything the API should not post to", () => {
    for (const endpoint of [
      "http://fcm.googleapis.com/x",
      "https://localhost/x",
      "https://127.0.0.1/x",
      "https://192.168.1.10/x",
      "https://internal/x",
      "not a url",
    ]) {
      expect(
        readPushSubscription({ ...subscription("1"), endpoint }),
      ).toBeNull();
    }
    expect(readPushSubscription({ endpoint: subscription("1").endpoint })).toBeNull();
    expect(readPushSubscription(null)).toBeNull();
  });
});
