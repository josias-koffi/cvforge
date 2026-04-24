import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CreditsModule } from "../credits/credits.module";
import { CreditsService } from "../credits/credits.service";
import { NotificationsModule } from "../notifications/notifications.module";
import { NotificationsService } from "../notifications/notifications.service";
import { resolveBillingConfig } from "./billing.config";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";

@Module({
  imports: [AuthModule, CreditsModule, NotificationsModule],
  controllers: [BillingController],
  providers: [
    {
      provide: BillingService,
      inject: [CreditsService, NotificationsService],
      useFactory: (
        creditsService: CreditsService,
        notificationsService: NotificationsService,
      ) =>
        new BillingService(
          resolveBillingConfig(process.env),
          creditsService,
          notificationsService,
        ),
    },
  ],
})
export class BillingModule {}
