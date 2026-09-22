import { Module } from "@nestjs/common";
import { OpenRouterModule, OPENROUTER_SERVICE } from "../ai/openrouter.module";
import { AuthModule } from "../auth/auth.module";
import { AuthMailerService } from "../auth/auth-mailer.service";
import { AuthService } from "../auth/auth.service";
import { DATABASE, type Database } from "../database/database.types";
import { AtsImpactService } from "./ats-impact.service";
import { AtsPurgeService } from "./ats-purge.service";
import { AtsScanService } from "./ats-scan.service";
import { AtsUnlockService } from "./ats-unlock.service";
import { PgAtsScanStore } from "./ats.pg-store";
import { PublicAtsScanController } from "./ats.controller";
import { ATS_SCAN_STORE, type AtsScanStore } from "./ats.types";
import { resolveAtsConfig } from "./ats.config";

@Module({
  imports: [AuthModule, OpenRouterModule],
  controllers: [PublicAtsScanController],
  providers: [
    {
      provide: AtsUnlockService,
      inject: [ATS_SCAN_STORE, AuthService, AuthMailerService],
      useFactory: (
        store: AtsScanStore,
        authService: ConstructorParameters<typeof AtsUnlockService>[1],
        authMailer: ConstructorParameters<typeof AtsUnlockService>[2],
      ) => new AtsUnlockService(store, authService, authMailer),
    },
    {
      provide: AtsPurgeService,
      inject: [ATS_SCAN_STORE],
      useFactory: (store: AtsScanStore) => new AtsPurgeService(store),
    },
    {
      provide: ATS_SCAN_STORE,
      inject: [DATABASE],
      useFactory: (db: Database) => new PgAtsScanStore(db),
    },
    {
      provide: AtsImpactService,
      inject: [OPENROUTER_SERVICE],
      useFactory: (
        openRouterService: ConstructorParameters<typeof AtsImpactService>[0],
      ) => new AtsImpactService(openRouterService),
    },
    {
      provide: AtsScanService,
      inject: [ATS_SCAN_STORE, AtsImpactService],
      useFactory: (store: AtsScanStore, impactService: AtsImpactService) => {
        const config = resolveAtsConfig();

        return new AtsScanService(
          store,
          impactService,
          config.dailyBudget,
          config.ipHashSecret,
        );
      },
    },
  ],
  exports: [ATS_SCAN_STORE, AtsScanService],
})
export class AtsModule {}
