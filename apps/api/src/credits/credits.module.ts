import { Module } from "@nestjs/common";
import { AdminAuditModule } from "../admin/admin-audit.module";
import { AuthModule } from "../auth/auth.module";
import { DATABASE, type Database } from "../database/database.types";
import { resolveCreditsConfig } from "./credits.config";
import { CreditsController } from "./credits.controller";
import { PgCreditLedgerStore } from "./credits.pg-store";
import { CreditsService } from "./credits.service";

@Module({
  imports: [AdminAuditModule, AuthModule],
  controllers: [CreditsController],
  providers: [
    {
      provide: PgCreditLedgerStore,
      inject: [DATABASE],
      useFactory: (db: Database) => new PgCreditLedgerStore(db),
    },
    {
      provide: CreditsService,
      inject: [PgCreditLedgerStore],
      useFactory: (store: PgCreditLedgerStore) =>
        new CreditsService(store, resolveCreditsConfig(process.env)),
    },
  ],
  exports: [CreditsService, PgCreditLedgerStore],
})
export class CreditsModule {}
