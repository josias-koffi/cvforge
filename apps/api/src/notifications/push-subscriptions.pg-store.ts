import type { PushSubscriptionInput } from "@cvforge/types";
import { and, eq } from "drizzle-orm";
import type { Database } from "../database/database.types";
import { pushSubscriptions } from "../database/schema";

/** DI token for the push subscriptions store. */
export const PUSH_SUBSCRIPTIONS_STORE = Symbol("PUSH_SUBSCRIPTIONS_STORE");

export type PushSubscriptionsStore = {
  /** A browser subscribing again, or under another account, takes the row over. */
  save: (userEmail: string, subscription: PushSubscriptionInput) => Promise<void>;
  listByUserEmail: (userEmail: string) => Promise<PushSubscriptionInput[]>;
  /** The candidate turning push off on one device. */
  remove: (userEmail: string, endpoint: string) => Promise<void>;
  /** The push service said the browser dropped it. */
  removeEndpoint: (endpoint: string) => Promise<void>;
};

export class PgPushSubscriptionsStore implements PushSubscriptionsStore {
  constructor(private readonly db: Database) {}

  async save(userEmail: string, subscription: PushSubscriptionInput) {
    const row = {
      auth: subscription.keys.auth,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      userEmail,
    };

    await this.db
      .insert(pushSubscriptions)
      .values(row)
      .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: row });
  }

  async listByUserEmail(userEmail: string) {
    const rows = await this.db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userEmail, userEmail));

    return rows.map((row) => ({
      endpoint: row.endpoint,
      keys: { auth: row.auth, p256dh: row.p256dh },
    }));
  }

  async remove(userEmail: string, endpoint: string) {
    await this.db
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userEmail, userEmail),
          eq(pushSubscriptions.endpoint, endpoint),
        ),
      );
  }

  async removeEndpoint(endpoint: string) {
    await this.db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint));
  }
}
