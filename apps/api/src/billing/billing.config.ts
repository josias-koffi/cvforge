import type { BillingConfig } from "./billing.types";

const DEFAULT_APP_URL = "http://localhost:3000";
const DEFAULT_STRIPE_API_BASE_URL = "https://api.stripe.com/v1";
const DEFAULT_WEBHOOK_TOLERANCE_SECONDS = 300;

function parsePositiveInt(rawValue: string | undefined, fallback: number) {
  if (!rawValue) {
    return fallback;
  }

  const value = Number.parseInt(rawValue, 10);

  return Number.isInteger(value) && value > 0 ? value : fallback;
}

export function resolveBillingConfig(env: NodeJS.ProcessEnv): BillingConfig {
  return {
    appUrl: (env.NEXT_PUBLIC_APP_URL ?? DEFAULT_APP_URL).replace(/\/$/, ""),
    stripeApiBaseUrl: (
      env.STRIPE_API_BASE_URL ?? DEFAULT_STRIPE_API_BASE_URL
    ).replace(/\/$/, ""),
    stripeSecretKey: env.STRIPE_SECRET_KEY?.trim() ?? "",
    stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET?.trim() ?? "",
    webhookToleranceSeconds: parsePositiveInt(
      env.STRIPE_WEBHOOK_TOLERANCE_SECONDS,
      DEFAULT_WEBHOOK_TOLERANCE_SECONDS,
    ),
  };
}
