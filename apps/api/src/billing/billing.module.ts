import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CreditsModule } from "../credits/credits.module";
import { CreditsService } from "../credits/credits.service";
import { resolveBillingConfig } from "./billing.config";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";

@Module({
  imports: [AuthModule, CreditsModule],
  controllers: [BillingController],
  providers: [
    {
      provide: BillingService,
      inject: [CreditsService],
      useFactory: (creditsService: CreditsService) =>
        new BillingService(resolveBillingConfig(process.env), creditsService),
    },
  ],
})
export class BillingModule {}
