import { Module } from "@nestjs/common";
import { AdminAuditModule } from "../admin/admin-audit.module";
import { AdminAuditService } from "../admin/admin-audit.service";
import { AuthModule } from "../auth/auth.module";
import { DATABASE, type Database } from "../database/database.types";
import { AdminLegalController, PublicLegalController } from "./legal.controller";
import { PgLegalDocumentsStore } from "./legal.pg-store";
import { LegalDocumentsService } from "./legal.service";

@Module({
  imports: [AdminAuditModule, AuthModule],
  controllers: [AdminLegalController, PublicLegalController],
  providers: [
    {
      provide: LegalDocumentsService,
      inject: [DATABASE, AdminAuditService],
      useFactory: (db: Database, audit: AdminAuditService) =>
        new LegalDocumentsService(new PgLegalDocumentsStore(db), audit),
    },
  ],
  exports: [LegalDocumentsService],
})
export class LegalDocumentsModule {}
