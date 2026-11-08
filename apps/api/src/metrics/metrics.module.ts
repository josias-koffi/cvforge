import { Module } from "@nestjs/common";
import {
  OPENROUTER_BALANCE_SERVICE,
  OpenRouterModule,
} from "../ai/openrouter.module";
import type { OpenRouterBalanceService } from "../ai/openrouter-balance.service";
import { AuthModule } from "../auth/auth.module";
import { AuthService } from "../auth/auth.service";
import { DATABASE, type Database } from "../database/database.types";
import { NotificationsModule } from "../notifications/notifications.module";
import { NotificationsService } from "../notifications/notifications.service";
import { AdminMetricsController } from "./admin-metrics.controller";
import { CockpitService } from "./cockpit.service";
import { resolveMetricsConfig } from "./metrics.config";
import { OpenRouterBalanceAlertService } from "./openrouter-balance-alert.service";

@Module({
  imports: [AuthModule, NotificationsModule, OpenRouterModule],
  controllers: [AdminMetricsController],
  providers: [
    {
      provide: CockpitService,
      inject: [DATABASE, OPENROUTER_BALANCE_SERVICE],
      useFactory: (db: Database, balanceService: OpenRouterBalanceService) =>
        new CockpitService(
          db,
          balanceService,
          resolveMetricsConfig(process.env).usdToEurRate,
        ),
    },
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
