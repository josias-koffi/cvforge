import { Module } from "@nestjs/common";
import {
  OPENROUTER_BALANCE_SERVICE,
  OpenRouterModule,
} from "../ai/openrouter.module";
import type { OpenRouterBalanceService } from "../ai/openrouter-balance.service";
import { AuthModule } from "../auth/auth.module";
import { AuthService } from "../auth/auth.service";
import { NotificationsModule } from "../notifications/notifications.module";
import { NotificationsService } from "../notifications/notifications.service";
import { AdminMetricsController } from "./admin-metrics.controller";
import { OpenRouterBalanceAlertService } from "./openrouter-balance-alert.service";

@Module({
  imports: [AuthModule, NotificationsModule, OpenRouterModule],
  controllers: [AdminMetricsController],
  providers: [
    {
      provide: OpenRouterBalanceAlertService,
      inject: [OPENROUTER_BALANCE_SERVICE, AuthService, NotificationsService],
      useFactory: (
        balanceService: OpenRouterBalanceService,
        authService: AuthService,
        notifications: NotificationsService,
      ) =>
        new OpenRouterBalanceAlertService(
          balanceService,
          authService,
          notifications,
        ),
    },
  ],
})
export class MetricsModule {}
