import { Module } from "@nestjs/common";
import { resolveApplicationsConfig } from "../applications/applications.config";
import { FileApplicationsStore } from "../applications/applications.store";
import { AuthModule } from "../auth/auth.module";
import { resolveAuthConfig } from "../auth/auth.config";
import { FileAuthAccountStore } from "../auth/auth-account-store";
import { CreditsModule } from "../credits/credits.module";
import { PgCreditLedgerStore } from "../credits/credits.pg-store";
import { resolveNotificationsConfig } from "../notifications/notifications.config";
import { FileNotificationsStore } from "../notifications/notifications.store";
import { resolveProfilesConfig } from "../profiles/profiles.config";
import { FileProfilesStore } from "../profiles/profiles.store";
import { PrivacyController } from "./privacy.controller";
import { PrivacyService } from "./privacy.service";

@Module({
  imports: [AuthModule, CreditsModule],
  controllers: [PrivacyController],
  providers: [
    {
      provide: PrivacyService,
      inject: [PgCreditLedgerStore],
      useFactory: (creditsStore: PgCreditLedgerStore) =>
        new PrivacyService(
          new FileAuthAccountStore(resolveAuthConfig(process.env).stateFilePath),
          new FileApplicationsStore(
            resolveApplicationsConfig(process.env).stateFilePath,
          ),
          creditsStore,
          new FileNotificationsStore(
            resolveNotificationsConfig(process.env).stateFilePath,
          ),
          new FileProfilesStore(resolveProfilesConfig(process.env).stateFilePath),
        ),
    },
  ],
  exports: [PrivacyService],
})
export class PrivacyModule {}
