import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CreditsModule } from "../credits/credits.module";
import { CreditsService } from "../credits/credits.service";
import { DATABASE, type Database } from "../database/database.types";
import { NotificationsModule } from "../notifications/notifications.module";
import { NotificationsService } from "../notifications/notifications.service";
import { CreditOffersModule } from "../offers/offers.module";
import { CreditOffersService } from "../offers/offers.service";
import { resolveBillingConfig } from "./billing.config";
import { BillingController } from "./billing.controller";
import { CheckoutService } from "./checkout.service";
import { PgCreditOrdersStore } from "./credit-orders.pg-store";
import { STRIPE_CLIENT, type StripeClient } from "./stripe.client";
import { StripeModule } from "./stripe.module";
import { StripeWebhookService } from "./stripe-webhook.service";

@Module({
  imports: [AuthModule, CreditOffersModule, CreditsModule, NotificationsModule, StripeModule],
  controllers: [BillingController],
  providers: [
    {
      provide: PgCreditOrdersStore,
      inject: [DATABASE],
      useFactory: (db: Database) => new PgCreditOrdersStore(db),
    },
    {
      provide: CheckoutService,
      inject: [STRIPE_CLIENT, CreditOffersService, PgCreditOrdersStore],
      useFactory: (
        stripe: StripeClient,
        offers: CreditOffersService,
        orders: PgCreditOrdersStore,
      ) => new CheckoutService(resolveBillingConfig(process.env), stripe, offers, orders),
    },
    {
      provide: StripeWebhookService,
      inject: [STRIPE_CLIENT, PgCreditOrdersStore, CreditsService, NotificationsService],
      useFactory: (
        stripe: StripeClient,
        orders: PgCreditOrdersStore,
        credits: CreditsService,
        notifications: NotificationsService,
      ) =>
        new StripeWebhookService(
          resolveBillingConfig(process.env),
          stripe,
          orders,
          credits,
          notifications,
        ),
    },
  ],
})
export class BillingModule {}
