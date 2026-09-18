import { Module } from "@nestjs/common";
import { DATABASE, type Database } from "../database/database.types";
import { PgAdminAuditStore } from "./admin-audit.pg-store";
import { AdminAuditService } from "./admin-audit.service";
import { ADMIN_AUDIT_STORE, type AdminAuditStore } from "./admin-audit.types";

/**
 * Its own module so the audit log has no owner: `AdminModule` writes to it and
 * `PrivacyModule` scrubs it during an account purge. Keeping the provider in
 * `AdminModule` would make those two import each other.
 */
@Module({
  providers: [
    {
      provide: ADMIN_AUDIT_STORE,
      inject: [DATABASE],
      useFactory: (db: Database) => new PgAdminAuditStore(db),
    },
    {
      provide: AdminAuditService,
      inject: [ADMIN_AUDIT_STORE],
      useFactory: (store: AdminAuditStore) => new AdminAuditService(store),
    },
  ],
  exports: [ADMIN_AUDIT_STORE, AdminAuditService],
})
export class AdminAuditModule {}
