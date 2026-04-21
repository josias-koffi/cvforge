import type { CreditPackId } from "@cvforge/types";

export type BillingConfig = {
  appUrl: string;
  stripeApiBaseUrl: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  webhookToleranceSeconds: number;
};

export type CreateCheckoutSessionInput = {
  packId: CreditPackId;
  userEmail: string;
};

export type StripeWebhookInput = {
  payload: string;
  signatureHeader: string | undefined;
};
