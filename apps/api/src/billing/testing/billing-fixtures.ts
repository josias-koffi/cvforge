import type { Database } from "../../database/database.types";
import { PgCreditOffersStore } from "../../offers/offers.pg-store";
import { offerInput } from "../../offers/testing/offer-fixtures";

export const APP_URL = "https://app.example.test";
export const WEBHOOK_SECRET = "whsec_test_secret";

export const BILLING_CONFIG = {
  appUrl: APP_URL,
  stripeSecretKey: "rk_test_123",
  stripeWebhookSecret: WEBHOOK_SECRET,
};

/** An active offer already synchronised with Stripe. */
export async function createSellableOffer(db: Database) {
  const store = new PgCreditOffersStore(db);
  const offer = await store.create(offerInput());

  return store.setStripeIds(offer.id, {
    stripePriceId: "price_discovery",
    stripeProductId: "prod_discovery",
  });
}
