import { describe, expect, it } from "vitest";
import { resolveBillingConfig } from "./billing.config";

describe("resolveBillingConfig", () => {
  it("provides local defaults", () => {
    const config = resolveBillingConfig({});

    expect(config.appUrl).toBe("http://localhost:3000");
    expect(config.stripeApiBaseUrl).toBe("https://api.stripe.com/v1");
    expect(config.stripeSecretKey).toBe("");
    expect(config.stripeWebhookSecret).toBe("");
    expect(config.webhookToleranceSeconds).toBe(300);
  });

  it("accepts explicit Stripe overrides", () => {
    const config = resolveBillingConfig({
      NEXT_PUBLIC_APP_URL: "https://app.example.test/",
      STRIPE_API_BASE_URL: "https://stripe.example.test/v1/",
      STRIPE_SECRET_KEY: "sk_test_123",
      STRIPE_WEBHOOK_SECRET: "whsec_123",
      STRIPE_WEBHOOK_TOLERANCE_SECONDS: "90",
    });

    expect(config.appUrl).toBe("https://app.example.test");
    expect(config.stripeApiBaseUrl).toBe("https://stripe.example.test/v1");
    expect(config.stripeSecretKey).toBe("sk_test_123");
    expect(config.stripeWebhookSecret).toBe("whsec_123");
    expect(config.webhookToleranceSeconds).toBe(90);
  });
});
