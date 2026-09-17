import type { BillingConfig } from "./billing.types";

const DEFAULT_APP_URL = "http://localhost:3000";

export function resolveBillingConfig(env: NodeJS.ProcessEnv): BillingConfig {
  return {
    appUrl: (env.NEXT_PUBLIC_APP_URL ?? DEFAULT_APP_URL).replace(/\/$/, ""),
    stripeSecretKey: env.STRIPE_SECRET_KEY?.trim() ?? "",
    stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET?.trim() ?? "",
  };
}
