import { Module } from "@nestjs/common";
import { resolveBillingConfig } from "./billing.config";
import { createStripeClient, STRIPE_CLIENT } from "./stripe.client";

@Module({
  providers: [
    {
      provide: STRIPE_CLIENT,
      useFactory: () =>
        createStripeClient(resolveBillingConfig(process.env).stripeSecretKey),
    },
  ],
  exports: [STRIPE_CLIENT],
})
export class StripeModule {}
