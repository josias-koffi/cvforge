import Stripe from "stripe";

export const STRIPE_CLIENT = Symbol("STRIPE_CLIENT");

/** `null` when Stripe is not configured for this environment. */
export type StripeClient = Stripe | null;

export function createStripeClient(secretKey: string): StripeClient {
  if (!secretKey) {
    return null;
  }

  return new Stripe(secretKey, {
    appInfo: { name: "CVSpark" },
    maxNetworkRetries: 2,
  });
}
