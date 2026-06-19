import { Module } from "@nestjs/common";
import { resolveApplicationsConfig } from "../applications/applications.config";
import { FileApplicationsStore } from "../applications/applications.store";
import { AuthModule } from "../auth/auth.module";
import { resolveAuthConfig } from "../auth/auth.config";
import { FileAuthAccountStore } from "../auth/auth-account-store";
import { resolveCreditsConfig } from "../credits/credits.config";
import { FileCreditLedgerStore } from "../credits/credits.store";
import { resolveNotificationsConfig } from "../notifications/notifications.config";
import { FileNotificationsStore } from "../notifications/notifications.store";
import { resolveProfilesConfig } from "../profiles/profiles.config";
import { FileProfilesStore } from "../profiles/profiles.store";
import { PrivacyController } from "./privacy.controller";
import { PrivacyService } from "./privacy.service";

@Module({
  imports: [AuthModule],
  controllers: [PrivacyController],
  providers: [
    {
      provide: PrivacyService,
      useFactory: () =>
        new PrivacyService(
          new FileAuthAccountStore(resolveAuthConfig(process.env).stateFilePath),
          new FileApplicationsStore(
            resolveApplicationsConfig(process.env).stateFilePath,
          ),
          new FileCreditLedgerStore(resolveCreditsConfig(process.env).stateFilePath),
          new FileNotificationsStore(
            resolveNotificationsConfig(process.env).stateFilePath,
          ),
          new FileProfilesStore(resolveProfilesConfig(process.env).stateFilePath),
        ),
    },
  ],
})
export class PrivacyModule {}
