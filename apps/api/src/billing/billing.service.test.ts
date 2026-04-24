import { BadRequestException, ServiceUnavailableException } from "@nestjs/common";
import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CreditsService } from "../credits/credits.service";
import type { NotificationsService } from "../notifications/notifications.service";
import { BillingService } from "./billing.service";
import type { BillingConfig } from "./billing.types";

const BASE_CONFIG: BillingConfig = {
  appUrl: "http://localhost:3000",
  stripeApiBaseUrl: "https://api.stripe.com/v1",
  stripeSecretKey: "sk_test_123",
  stripeWebhookSecret: "whsec_test_123",
  webhookToleranceSeconds: 300,
};

function signPayload(payload: string, secret: string, timestamp = 1_700_000_000) {
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`, "utf8")
    .digest("hex");

  return `t=${timestamp},v1=${signature}`;
}

describe("BillingService", () => {
  const fetchMock = vi.fn();
  const creditsService = {
    recordStripePurchase: vi.fn(),
  } as unknown as CreditsService;
  const notificationsService = {
    sendCreditPurchaseConfirmationEmail: vi.fn(),
  } as unknown as NotificationsService;

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2023-11-14T22:13:20.000Z"));
    vi.mocked(creditsService.recordStripePurchase).mockReset();
    vi.mocked(notificationsService.sendCreditPurchaseConfirmationEmail).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("creates a Stripe Checkout session for the requested pack", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "cs_test_123",
          url: "https://checkout.stripe.com/c/session_123",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const service = new BillingService(
      BASE_CONFIG,
      creditsService,
      notificationsService,
    );
    const result = await service.createCheckoutSession({
      packId: "starter",
      userEmail: "user@example.com",
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = String(init.body);

    expect(url).toBe("https://api.stripe.com/v1/checkout/sessions");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer sk_test_123",
    );
    expect(body).toContain("mode=payment");
    expect(body).toContain("metadata%5BpackId%5D=starter");
    expect(body).toContain("customer_email=user%40example.com");
    expect(result.checkoutUrl).toBe("https://checkout.stripe.com/c/session_123");
  });

  it("rejects checkout creation when Stripe is not configured", async () => {
    const service = new BillingService(
      { ...BASE_CONFIG, stripeSecretKey: "" },
      creditsService,
      notificationsService,
    );

    await expect(
      service.createCheckoutSession({
        packId: "starter",
        userEmail: "user@example.com",
      }),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it("credits the ledger for a verified checkout.session.completed event", async () => {
    vi.mocked(creditsService.recordStripePurchase).mockReturnValue({
      action: "stripe_purchase",
      amount: 550,
      balanceAfter: 550,
      createdAt: "2026-04-21T12:00:00.000Z",
      id: "entry-001",
      metadata: {
        packId: "starter",
        stripeCheckoutSessionId: "cs_test_123",
        stripePaymentIntentId: "pi_123",
      },
      note: "Achat Stripe starter (999 cents)",
      type: "stripe_purchase",
      userEmail: "user@example.com",
    });

    const payload = JSON.stringify({
      id: "evt_123",
      type: "checkout.session.completed",
      data: {
        object: {
          amount_total: 999,
          customer_email: "user@example.com",
          id: "cs_test_123",
          metadata: {
            packId: "starter",
            userEmail: "user@example.com",
          },
          payment_intent: "pi_123",
        },
      },
    });

    const service = new BillingService(
      BASE_CONFIG,
      creditsService,
      notificationsService,
    );
    const result = await service.handleWebhook({
      payload,
      signatureHeader: signPayload(payload, BASE_CONFIG.stripeWebhookSecret),
    });

    expect(creditsService.recordStripePurchase).toHaveBeenCalledWith({
      amountCents: 999,
      credits: 550,
      packId: "starter",
      stripeCheckoutSessionId: "cs_test_123",
      stripePaymentIntentId: "pi_123",
      userEmail: "user@example.com",
    });
    expect(
      notificationsService.sendCreditPurchaseConfirmationEmail,
    ).toHaveBeenCalledWith({
      amountCents: 999,
      credits: 550,
      packId: "starter",
      userEmail: "user@example.com",
    });
    expect(result).toMatchObject({ handled: "credited" });
  });

  it("acknowledges failed payment events without crediting", async () => {
    const payload = JSON.stringify({
      id: "evt_123",
      type: "checkout.session.async_payment_failed",
      data: {
        object: {
          id: "cs_test_123",
          payment_intent: "pi_123",
        },
      },
    });

    const service = new BillingService(
      BASE_CONFIG,
      creditsService,
      notificationsService,
    );
    const result = await service.handleWebhook({
      payload,
      signatureHeader: signPayload(payload, BASE_CONFIG.stripeWebhookSecret),
    });

    expect(result).toEqual({ handled: "payment_failed" });
    expect(creditsService.recordStripePurchase).not.toHaveBeenCalled();
    expect(
      notificationsService.sendCreditPurchaseConfirmationEmail,
    ).not.toHaveBeenCalled();
  });

  it("rejects webhook payloads with an invalid signature", async () => {
    const payload = JSON.stringify({
      id: "evt_123",
      type: "checkout.session.completed",
      data: { object: { id: "cs_test_123" } },
    });

    const service = new BillingService(
      BASE_CONFIG,
      creditsService,
      notificationsService,
    );

    await expect(
      service.handleWebhook({
        payload,
        signatureHeader: "t=1700000000,v1=bad",
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
