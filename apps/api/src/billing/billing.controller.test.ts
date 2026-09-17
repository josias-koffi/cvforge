import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { AuthService } from "../auth/auth.service";
import { BillingController } from "./billing.controller";
import type { CheckoutService } from "./checkout.service";
import type { StripeWebhookService } from "./stripe-webhook.service";

const OFFER_ID = "0d4b8f0e-5c8e-4d1a-9b6c-7e2f3a1b9c0d";

function makeController(session: unknown = { email: "user@example.com", role: "user" }) {
  const checkout = {
    createCheckoutSession: vi.fn().mockResolvedValue({ checkoutUrl: "https://stripe", sessionId: "cs_1" }),
    listOrdersForUser: vi.fn().mockResolvedValue([{ id: "order-1" }]),
  };
  const webhooks = { handle: vi.fn().mockResolvedValue({ eventId: "evt_1", outcome: "credited" }) };
  const authService = { readSessionFromCookieHeader: vi.fn().mockReturnValue(session) };

  return {
    checkout,
    controller: new BillingController(
      checkout as unknown as CheckoutService,
      webhooks as unknown as StripeWebhookService,
      authService as unknown as AuthService,
    ),
    webhooks,
  };
}

const request = { headers: { cookie: "cvforge_session=abc" } };

describe("BillingController", () => {
  it("starts a checkout for the session's user", async () => {
    const { checkout, controller } = makeController();

    await expect(controller.createCheckoutSession({ offerId: OFFER_ID }, request)).resolves.toEqual({
      checkoutUrl: "https://stripe",
      sessionId: "cs_1",
    });
    expect(checkout.createCheckoutSession).toHaveBeenCalledWith({
      offerId: OFFER_ID,
      userEmail: "user@example.com",
    });
  });

  it("rejects an invalid offer id and anonymous buyers", () => {
    expect(() => makeController().controller.createCheckoutSession({ offerId: "pro" }, request)).toThrow(
      BadRequestException,
    );
    expect(() =>
      makeController(null).controller.createCheckoutSession({ offerId: OFFER_ID }, request),
    ).toThrow(UnauthorizedException);
  });

  it("lists the user's orders", async () => {
    await expect(makeController().controller.listMyOrders(request)).resolves.toEqual({
      orders: [{ id: "order-1" }],
    });
  });

  it("passes the raw body and signature to the webhook service", async () => {
    const { controller, webhooks } = makeController(null);
    const rawBody = Buffer.from("{}");

    await controller.handleStripeWebhook({ headers: { "stripe-signature": "t=1,v1=x" }, rawBody });

    expect(webhooks.handle).toHaveBeenCalledWith(rawBody, "t=1,v1=x");
  });
});
