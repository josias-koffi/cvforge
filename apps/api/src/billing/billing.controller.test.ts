import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { AuthService } from "../auth/auth.service";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";

function makeController(session: unknown) {
  const billingService = {
    createCheckoutSession: vi.fn().mockResolvedValue({
      checkoutUrl: "https://checkout.stripe.com/c/session_123",
      sessionId: "cs_test_123",
    }),
    handleWebhook: vi.fn().mockReturnValue({ handled: "ignored" }),
  } as unknown as BillingService;
  const authService = {
    readSessionFromCookieHeader: vi.fn().mockReturnValue(session),
  } as unknown as AuthService;

  return {
    billingService,
    controller: new BillingController(billingService, authService),
  };
}

describe("BillingController", () => {
  it("creates a checkout session for the authenticated user", async () => {
    const { controller, billingService } = makeController({
      email: "user@example.com",
      role: "user",
    });

    const response = await controller.createCheckoutSession(
      { packId: "pro" },
      { headers: { cookie: "cvforge_session=abc" } },
    );

    expect(billingService.createCheckoutSession).toHaveBeenCalledWith({
      packId: "pro",
      userEmail: "user@example.com",
    });
    expect(response).toEqual({
      checkoutUrl: "https://checkout.stripe.com/c/session_123",
      sessionId: "cs_test_123",
    });
  });

  it("rejects unauthenticated checkout creation", async () => {
    const { controller } = makeController(null);

    expect(() =>
      controller.createCheckoutSession(
        { packId: "starter" },
        { headers: {} },
      ),
    ).toThrow(UnauthorizedException);
  });

  it("rejects invalid pack ids", () => {
    const { controller } = makeController({
      email: "user@example.com",
      role: "user",
    });

    expect(() =>
      controller.createCheckoutSession(
        { packId: "enterprise" as never },
        { headers: { cookie: "cvforge_session=abc" } },
      ),
    ).toThrow(BadRequestException);
  });

  it("passes the raw payload and signature to webhook handling", () => {
    const { controller, billingService } = makeController(null);

    controller.handleStripeWebhook({
      headers: {
        "stripe-signature": "t=1,v1=test",
      },
      rawBody: Buffer.from('{"id":"evt_123"}', "utf8"),
    });

    expect(billingService.handleWebhook).toHaveBeenCalledWith({
      payload: '{"id":"evt_123"}',
      signatureHeader: "t=1,v1=test",
    });
  });
});
