import { Module } from "@nestjs/common";
import { AdminAuditModule } from "../../admin/admin-audit.module";
import { AdminAuditService } from "../../admin/admin-audit.service";
import { AuthModule } from "../../auth/auth.module";
import { DATABASE, type Database } from "../../database/database.types";
import { resolveOpenRouterConfig } from "../openrouter.config";
import { FEATURE_MODEL_ROUTER, OpenRouterModule } from "../openrouter.module";
import { PgAnthropicCreditStore } from "./anthropic-credit.pg-store";
import type { FeatureModelRouter } from "./feature-model.router";
import { FeatureModelsAdminService } from "./feature-models.admin.service";
import { FeatureModelsController } from "./feature-models.controller";
import { PgFeatureModelsStore } from "./feature-models.pg-store";

@Module({
  imports: [AdminAuditModule, AuthModule, OpenRouterModule],
  controllers: [FeatureModelsController],
  providers: [
    {
      provide: FeatureModelsAdminService,
      inject: [DATABASE, FEATURE_MODEL_ROUTER, AdminAuditService],
      useFactory: (db: Database, router: FeatureModelRouter, audit: AdminAuditService) =>
        new FeatureModelsAdminService(
          new PgFeatureModelsStore(db),
          router,
          audit,
          resolveOpenRouterConfig(),
          new PgAnthropicCreditStore(db),
        ),
    },
  ],
})
export class FeatureModelsModule {}
