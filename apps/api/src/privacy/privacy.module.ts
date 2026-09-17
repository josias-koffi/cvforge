import { Module } from "@nestjs/common";
import { ApplicationsModule } from "../applications/applications.module";
import {
  APPLICATIONS_STORE,
  type ApplicationsStore,
} from "../applications/applications.types";
import { AuthModule } from "../auth/auth.module";
import { AUTH_ACCOUNT_STORE, type AuthAccountStore } from "../auth/auth.types";
import { CreditsModule } from "../credits/credits.module";
import { PgCreditLedgerStore } from "../credits/credits.pg-store";
import { NotificationsModule } from "../notifications/notifications.module";
import {
  NOTIFICATIONS_STORE,
  type NotificationsStore,
} from "../notifications/notifications.types";
import { ProfilesModule } from "../profiles/profiles.module";
import { PROFILES_STORE, type ProfilesStore } from "../profiles/profiles.types";
import { PrivacyController } from "./privacy.controller";
import { PrivacyService } from "./privacy.service";

@Module({
  imports: [
    ApplicationsModule,
    AuthModule,
    CreditsModule,
    NotificationsModule,
    ProfilesModule,
  ],
  controllers: [PrivacyController],
  providers: [
    {
      provide: PrivacyService,
      inject: [
        AUTH_ACCOUNT_STORE,
        APPLICATIONS_STORE,
        PgCreditLedgerStore,
        NOTIFICATIONS_STORE,
        PROFILES_STORE,
      ],
      useFactory: (
        authStore: AuthAccountStore,
        applicationsStore: ApplicationsStore,
        creditsStore: PgCreditLedgerStore,
        notificationsStore: NotificationsStore,
        profilesStore: ProfilesStore,
      ) =>
        new PrivacyService(
          authStore,
          applicationsStore,
          creditsStore,
          notificationsStore,
          profilesStore,
        ),
    },
  ],
  exports: [PrivacyService],
})
export class PrivacyModule {}
