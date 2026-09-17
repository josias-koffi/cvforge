import { describe, expect, it } from "vitest";
import { resolveBillingConfig } from "./billing.config";

describe("resolveBillingConfig", () => {
  it("provides local defaults", () => {
    expect(resolveBillingConfig({})).toEqual({
      appUrl: "http://localhost:3000",
      stripeSecretKey: "",
      stripeWebhookSecret: "",
    });
  });

  it("reads the Stripe keys and trims the app URL", () => {
    expect(
      resolveBillingConfig({
        NEXT_PUBLIC_APP_URL: "https://app.example.test/",
        STRIPE_SECRET_KEY: " rk_test_123 ",
        STRIPE_WEBHOOK_SECRET: "whsec_123",
      }),
    ).toEqual({
      appUrl: "https://app.example.test",
      stripeSecretKey: "rk_test_123",
      stripeWebhookSecret: "whsec_123",
    });
  });
});
