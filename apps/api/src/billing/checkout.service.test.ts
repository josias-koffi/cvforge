import type { AdminCreditOffer } from "@cvforge/types";
import {
  BadGatewayException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDatabase, type TestDatabase } from "../database/testing/test-database";
import { CreditOffersService } from "../offers/offers.service";
import { PgCreditOffersStore } from "../offers/offers.pg-store";
import { CHECKOUT_INTEGRATION_IDENTIFIER, CheckoutService } from "./checkout.service";
import { PgCreditOrdersStore } from "./credit-orders.pg-store";
import { APP_URL, BILLING_CONFIG, createSellableOffer } from "./testing/billing-fixtures";

const USER = "buyer@example.com";

describe("CheckoutService", () => {
  let testDatabase: TestDatabase;
  let orders: PgCreditOrdersStore;
  let offers: CreditOffersService;
  let offer: AdminCreditOffer;
  const stripe = { checkout: { sessions: { create: vi.fn() } } };

  beforeAll(async () => {
    testDatabase = await createTestDatabase();
    orders = new PgCreditOrdersStore(testDatabase.db);
    offers = new CreditOffersService(new PgCreditOffersStore(testDatabase.db), null);
  });

  afterAll(async () => {
    await testDatabase.close();
  });

  beforeEach(async () => {
    await testDatabase.reset();
    offer = await createSellableOffer(testDatabase.db);
    stripe.checkout.sessions.create.mockReset().mockResolvedValue({
      id: "cs_test_1",
      url: "https://checkout.stripe.com/c/pay/cs_test_1",
    });
  });

  function service(
    client: typeof stripe | null = stripe,
    creditSupply: { isUnderCriticalThreshold: () => Promise<boolean> } | null = null,
  ) {
    return new CheckoutService(BILLING_CONFIG, client, offers, orders, creditSupply);
  }

  it("creates a pending order and a Checkout Session for the offer's price", async () => {
    await expect(
      service().createCheckoutSession({ offerId: offer.id, userEmail: USER }),
    ).resolves.toEqual({
      checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_1",
      sessionId: "cs_test_1",
    });

    const [order] = await orders.listForUser(USER);
    const [params, options] = stripe.checkout.sessions.create.mock.calls[0];

    expect(order).toMatchObject({
      credits: 300,
      offerId: offer.id,
      priceCents: 599,
      status: "pending",
      stripeCheckoutSessionId: "cs_test_1",
    });
    expect(params).toEqual({
      cancel_url: `${APP_URL}/credits?billing=cancelled`,
      client_reference_id: order.id,
      customer_email: USER,
      integration_identifier: CHECKOUT_INTEGRATION_IDENTIFIER,
      line_items: [{ price: "price_discovery", quantity: 1 }],
      metadata: { offerId: offer.id, orderId: order.id },
      mode: "payment",
      payment_intent_data: { metadata: { offerId: offer.id, orderId: order.id } },
      success_url: `${APP_URL}/credits?billing=success&session_id={CHECKOUT_SESSION_ID}`,
    });
    expect(params).not.toHaveProperty("payment_method_types");
    expect(options).toEqual({ idempotencyKey: `credit-order-checkout-${order.id}` });
  });

  it("refuses to sell when Stripe is not configured", async () => {
    await expect(
      service(null).createCheckoutSession({ offerId: offer.id, userEmail: USER }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it("marks the order failed when Stripe rejects the session", async () => {
    stripe.checkout.sessions.create.mockRejectedValue(new Error("No such price"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(
      service().createCheckoutSession({ offerId: offer.id, userEmail: USER }),
    ).rejects.toBeInstanceOf(BadGatewayException);
    await expect(service().listOrdersForUser(USER)).resolves.toMatchObject([
      { status: "failed" },
    ]);
  });

  it("rejects a session without a payment URL", async () => {
    stripe.checkout.sessions.create.mockResolvedValue({ id: "cs_test_2", url: null });

    await expect(
      service().createCheckoutSession({ offerId: offer.id, userEmail: USER }),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it("lists the buyer's orders without internal fields", async () => {
    await service().createCheckoutSession({ offerId: offer.id, userEmail: USER });

    const [order] = await service().listOrdersForUser(USER);

    expect(order).toMatchObject({ offerName: offer.name, status: "pending" });
    expect(order).not.toHaveProperty("userEmail");
    expect(order).not.toHaveProperty("ledgerEntryId");
  });

  it("refuses the purchase when the AI provider is out of credits", async () => {
    const creditSupply = {
      isUnderCriticalThreshold: vi.fn().mockResolvedValue(true),
    };

    await expect(
      service(stripe, creditSupply).createCheckoutSession({
        offerId: offer.id,
        userEmail: USER,
      }),
    ).rejects.toThrow(ServiceUnavailableException);

    // Refused at the door: no Stripe session, and no dangling pending order.
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
    await expect(orders.listForUser(USER)).resolves.toEqual([]);
  });

  it("sells normally when the provider balance is healthy or unknown", async () => {
    const healthy = { isUnderCriticalThreshold: vi.fn().mockResolvedValue(false) };

    await expect(
      service(stripe, healthy).createCheckoutSession({
        offerId: offer.id,
        userEmail: USER,
      }),
    ).resolves.toMatchObject({ sessionId: "cs_test_1" });
    expect(healthy.isUnderCriticalThreshold).toHaveBeenCalledOnce();

    // No guard wired at all (supervision off) must not block the sale either.
    stripe.checkout.sessions.create.mockResolvedValue({
      id: "cs_test_2",
      url: "https://checkout.stripe.com/c/pay/cs_test_2",
    });

    await expect(
      service().createCheckoutSession({ offerId: offer.id, userEmail: USER }),
    ).resolves.toMatchObject({ sessionId: "cs_test_2" });
  });

  it("reports purchase availability without leaking the provider balance", async () => {
    await expect(service().readPurchaseAvailability()).resolves.toEqual({
      available: true,
      reason: null,
    });

    await expect(
      service(stripe, {
        isUnderCriticalThreshold: vi.fn().mockResolvedValue(true),
      }).readPurchaseAvailability(),
    ).resolves.toEqual({ available: false, reason: "ai_credits_exhausted" });

    await expect(service(null).readPurchaseAvailability()).resolves.toEqual({
      available: false,
      reason: "stripe_unavailable",
    });
  });
});
