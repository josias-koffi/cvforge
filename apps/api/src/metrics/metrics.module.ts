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
import { resolveMetricsConfig } from "./metrics.config";
import { PgMetricsStore } from "./metrics.pg-store";
import { MetricsService } from "./metrics.service";
import { METRICS_STORE, type MetricsStore } from "./metrics.types";
import { OpenRouterBalanceAlertService } from "./openrouter-balance-alert.service";

@Module({
  imports: [AuthModule, NotificationsModule, OpenRouterModule],
  controllers: [AdminMetricsController],
  providers: [
    {
      provide: METRICS_STORE,
      inject: [DATABASE],
      useFactory: (db: Database) => new PgMetricsStore(db),
    },
    {
      provide: MetricsService,
      inject: [METRICS_STORE, OPENROUTER_BALANCE_SERVICE],
      useFactory: (
        store: MetricsStore,
        balanceService: OpenRouterBalanceService,
      ) =>
        new MetricsService(
          store,
          balanceService,
          resolveMetricsConfig(process.env),
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
