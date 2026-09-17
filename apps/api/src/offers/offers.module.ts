import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { StripeModule } from "../billing/stripe.module";
import { STRIPE_CLIENT, type StripeClient } from "../billing/stripe.client";
import { DATABASE, type Database } from "../database/database.types";
import {
  AdminCreditOffersController,
  PublicCreditOffersController,
} from "./offers.controller";
import { PgCreditOffersStore } from "./offers.pg-store";
import { CreditOffersService } from "./offers.service";
import { OfferStripeSync } from "./offers-stripe-sync";

@Module({
  imports: [AuthModule, StripeModule],
  controllers: [AdminCreditOffersController, PublicCreditOffersController],
  providers: [
    {
      provide: CreditOffersService,
      inject: [DATABASE, STRIPE_CLIENT],
      useFactory: (db: Database, stripe: StripeClient) =>
        new CreditOffersService(
          new PgCreditOffersStore(db),
          stripe ? new OfferStripeSync(stripe) : null,
        ),
    },
  ],
  exports: [CreditOffersService],
})
export class CreditOffersModule {}
