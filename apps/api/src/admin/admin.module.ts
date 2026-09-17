import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CreditsModule } from "../credits/credits.module";
import { PrivacyModule } from "../privacy/privacy.module";
import { DATABASE, type Database } from "../database/database.types";
import { AdminAuditModule } from "./admin-audit.module";
import { PgAdminUsersStore } from "./admin-users.pg-store";
import { AdminUsersService } from "./admin-users.service";
import { ADMIN_USERS_STORE, type AdminUsersStore } from "./admin-users.types";
import { AdminAuditController } from "./admin-audit.controller";
import { AdminUsersController } from "./admin-users.controller";

@Module({
  imports: [AdminAuditModule, AuthModule, CreditsModule, PrivacyModule],
  controllers: [AdminAuditController, AdminUsersController],
  providers: [
    {
      provide: ADMIN_USERS_STORE,
      inject: [DATABASE],
      useFactory: (db: Database) => new PgAdminUsersStore(db),
    },
    {
      provide: AdminUsersService,
      inject: [ADMIN_USERS_STORE],
      useFactory: (store: AdminUsersStore) => new AdminUsersService(store),
    },
  ],
})
export class AdminModule {}
