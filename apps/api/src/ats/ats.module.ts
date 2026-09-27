import { Module } from "@nestjs/common";
import { OpenRouterModule, OPENROUTER_SERVICE } from "../ai/openrouter.module";
import { AuthModule } from "../auth/auth.module";
import { DATABASE, type Database } from "../database/database.types";
import { LeadCaptureService } from "../leads/lead-capture.service";
import { LeadsModule } from "../leads/leads.module";
import { AtsReportsController } from "./ats-reports.controller";
import { AtsReportsService } from "./ats-reports.service";
import { AtsImpactService } from "./ats-impact.service";
import { AtsPurgeService } from "./ats-purge.service";
import { AtsScanService } from "./ats-scan.service";
import { AtsUnlockService } from "./ats-unlock.service";
import { PgAtsScanStore } from "./ats.pg-store";
import { PublicAtsScanController } from "./ats.controller";
import { ATS_SCAN_STORE, type AtsScanStore } from "./ats.types";
import { resolveAtsConfig } from "./ats.config";

@Module({
  imports: [AuthModule, LeadsModule, OpenRouterModule],
  controllers: [AtsReportsController, PublicAtsScanController],
  providers: [
    {
      provide: AtsUnlockService,
      inject: [ATS_SCAN_STORE, LeadCaptureService],
      useFactory: (store: AtsScanStore, leads: LeadCaptureService) =>
        new AtsUnlockService(store, leads),
    },
    {
      provide: AtsReportsService,
      inject: [ATS_SCAN_STORE],
      useFactory: (store: AtsScanStore) => new AtsReportsService(store),
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
