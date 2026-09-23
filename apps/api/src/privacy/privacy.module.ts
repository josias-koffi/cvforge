import { Module } from "@nestjs/common";
import { AdminAuditModule } from "../admin/admin-audit.module";
import {
  ADMIN_AUDIT_STORE,
  type AdminAuditStore,
} from "../admin/admin-audit.types";
import { ApplicationsModule } from "../applications/applications.module";
import { BillingModule } from "../billing/billing.module";
import { PgCreditOrdersStore } from "../billing/credit-orders.pg-store";
import { InterviewModule } from "../interview/interview.module";
import {
  INTERVIEW_STORE,
  type InterviewStore,
} from "../interview/interview.types";
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
import { JobSearchModule } from "../job-search/job-search.module";
import {
  JOB_MATCHES_STORE,
  type JobMatchesStore,
} from "../job-search/matches.types";
import { SearchProjectsModule } from "../search-projects/search-projects.module";
import {
  SEARCH_PROJECTS_STORE,
  type SearchProjectsStore,
} from "../search-projects/search-projects.types";
import { PrivacyController } from "./privacy.controller";
import { PrivacyService } from "./privacy.service";

@Module({
  imports: [
    AdminAuditModule,
    ApplicationsModule,
    AuthModule,
    BillingModule,
    CreditsModule,
    InterviewModule,
    NotificationsModule,
    ProfilesModule,
    JobSearchModule,
    SearchProjectsModule,
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
        SEARCH_PROJECTS_STORE,
        JOB_MATCHES_STORE,
        INTERVIEW_STORE,
        PgCreditOrdersStore,
        ADMIN_AUDIT_STORE,
      ],
      useFactory: (
        authStore: AuthAccountStore,
        applicationsStore: ApplicationsStore,
        creditsStore: PgCreditLedgerStore,
        notificationsStore: NotificationsStore,
        profilesStore: ProfilesStore,
        searchProjectsStore: SearchProjectsStore,
        jobMatchesStore: JobMatchesStore,
        interviewStore: InterviewStore,
        creditOrdersStore: PgCreditOrdersStore,
        auditStore: AdminAuditStore,
      ) =>
        new PrivacyService(
          authStore,
          applicationsStore,
          creditsStore,
          notificationsStore,
          profilesStore,
          searchProjectsStore,
          jobMatchesStore,
          interviewStore,
          creditOrdersStore,
          auditStore,
        ),
    },
  ],
  exports: [PrivacyService],
})
export class PrivacyModule {}
