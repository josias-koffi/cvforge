import {
  BadRequestException,
  ServiceUnavailableException,
} from "@nestjs/common";
import Stripe from "stripe";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PgCreditLedgerStore } from "../credits/credits.pg-store";
import { CreditsService } from "../credits/credits.service";
import { createTestDatabase, type TestDatabase } from "../database/testing/test-database";
import { PgCreditOrdersStore } from "./credit-orders.pg-store";
import { StripeWebhookService } from "./stripe-webhook.service";
import { BILLING_CONFIG, createSellableOffer, WEBHOOK_SECRET } from "./testing/billing-fixtures";

const USER = "buyer@example.com";
// Signature helpers only: no request ever leaves the test.
const stripe = new Stripe("sk_test_offline");

describe("StripeWebhookService", () => {
  let testDatabase: TestDatabase;
  let orders: PgCreditOrdersStore;
  let credits: CreditsService;
  let service: StripeWebhookService;
  let orderId: string;
  const notifications = { sendCreditPurchaseConfirmationEmail: vi.fn() };

  beforeAll(async () => {
    testDatabase = await createTestDatabase();
    orders = new PgCreditOrdersStore(testDatabase.db);
    credits = new CreditsService(new PgCreditLedgerStore(testDatabase.db), {
      lowBalanceThreshold: 20,
    });
    service = new StripeWebhookService(BILLING_CONFIG, stripe, orders, credits, notifications);
  });

  afterAll(async () => {
    await testDatabase.close();
  });

  beforeEach(async () => {
    await testDatabase.reset();
    notifications.sendCreditPurchaseConfirmationEmail.mockReset().mockResolvedValue(undefined);
    const offer = await createSellableOffer(testDatabase.db);
    const order = await orders.createPending({
      credits: offer.credits,
      currency: offer.currency,
      offerId: offer.id,
      offerName: offer.name,
      priceCents: offer.priceCents,
      userEmail: USER,
    });
    orderId = order.id;
    await orders.attachCheckoutSession(orderId, "cs_test_1");
  });

  function signed(type: string, session: Record<string, unknown>) {
    const payload = JSON.stringify({
      data: {
        object: {
          amount_total: 599,
          id: "cs_test_1",
          metadata: { orderId },
          object: "checkout.session",
          payment_intent: "pi_1",
          payment_status: "paid",
          ...session,
        },
      },
      id: `evt_${type}`,
      object: "event",
      type,
    });

    return {
      body: Buffer.from(payload),
      signature: stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET }),
    };
  }

  async function send(type: string, session: Record<string, unknown> = {}) {
    const { body, signature } = signed(type, session);

    return (await service.handle(body, signature)).outcome;
  }

  it("credits the order snapshot once, even when Stripe replays the event", async () => {
    await expect(send("checkout.session.completed")).resolves.toBe("credited");
    await expect(send("checkout.session.completed")).resolves.toBe("already_credited");

    await expect(credits.getSummaryForUser(USER)).resolves.toMatchObject({ balance: 300 });
    await expect(orders.findById(orderId)).resolves.toMatchObject({
      paidAt: expect.any(String),
      status: "paid",
    });
    expect(notifications.sendCreditPurchaseConfirmationEmail).toHaveBeenCalledTimes(1);
    expect(notifications.sendCreditPurchaseConfirmationEmail).toHaveBeenCalledWith({
      amountCents: 599,
      credits: 300,
      offerName: "Decouverte",
      userEmail: USER,
    });
  });

  it("waits for delayed payments, then credits on async success", async () => {
    await expect(
      send("checkout.session.completed", { payment_status: "unpaid" }),
    ).resolves.toBe("awaiting_payment");
    await expect(credits.getSummaryForUser(USER)).resolves.toMatchObject({ balance: 0 });

    await expect(send("checkout.session.async_payment_succeeded")).resolves.toBe("credited");
    await expect(credits.getSummaryForUser(USER)).resolves.toMatchObject({ balance: 300 });
  });

  it("closes failed and expired orders without crediting", async () => {
    await expect(send("checkout.session.async_payment_failed")).resolves.toBe("marked_failed");
    await expect(orders.findById(orderId)).resolves.toMatchObject({ status: "failed" });
    await expect(send("checkout.session.expired")).resolves.toBe("marked_expired");
    await expect(orders.findById(orderId)).resolves.toMatchObject({ status: "failed" });
    await expect(credits.getSummaryForUser(USER)).resolves.toMatchObject({ balance: 0 });
  });

  it("never downgrades a paid order", async () => {
    await send("checkout.session.completed");
    await send("checkout.session.expired");

    await expect(orders.findById(orderId)).resolves.toMatchObject({ status: "paid" });
  });

  it("ignores sessions this API did not create and unrelated events", async () => {
    await expect(send("checkout.session.completed", { metadata: {} })).resolves.toBe("ignored");
    await expect(send("checkout.session.completed", { id: "cs_other" })).resolves.toBe("ignored");
    await expect(send("customer.created")).resolves.toBe("ignored");
    await expect(credits.getSummaryForUser(USER)).resolves.toMatchObject({ balance: 0 });
  });

  it("keeps the credits when the confirmation email fails", async () => {
    notifications.sendCreditPurchaseConfirmationEmail.mockRejectedValue(new Error("SMTP down"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(send("checkout.session.completed")).resolves.toBe("credited");
    await expect(credits.getSummaryForUser(USER)).resolves.toMatchObject({ balance: 300 });
  });

  it("rejects missing or forged signatures", async () => {
    const { body } = signed("checkout.session.completed", {});

    await expect(service.handle(body, undefined)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.handle(body, "t=1,v1=forged")).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("answers 503 when the webhook secret is not configured", async () => {
    const unconfigured = new StripeWebhookService(
      { ...BILLING_CONFIG, stripeWebhookSecret: "" },
      stripe,
      orders,
      credits,
      notifications,
    );
    const { body, signature } = signed("checkout.session.completed", {});

    await expect(unconfigured.handle(body, signature)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
