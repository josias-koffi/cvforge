import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { AdminAuditStore } from "../admin/admin-audit.types";
import type { ApplicationsStore } from "../applications/applications.types";
import type { CreditOrdersStore } from "../billing/billing.types";
import type { InterviewStore } from "../interview/interview.types";
import type { AuthAccountStore } from "../auth/auth.types";
import type { CreditLedgerStore } from "../credits/credits.types";
import type { NotificationsStore } from "../notifications/notifications.types";
import type { ProfilesStore } from "../profiles/profiles.types";
import type { JobMatchesStore } from "../job-search/matches.types";
import type { SearchProjectsStore } from "../search-projects/search-projects.types";
import { PRIVACY_RETENTION_POLICY } from "./privacy-retention-policy";
import type {
  PrivacyDeletionSummary,
  PrivacyExportPayload,
} from "./privacy.types";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

@Injectable()
export class PrivacyService {
  constructor(
    private readonly authStore: AuthAccountStore,
    private readonly applicationsStore: ApplicationsStore,
    private readonly creditsStore: CreditLedgerStore,
    private readonly notificationsStore: NotificationsStore,
    private readonly profilesStore: ProfilesStore,
    private readonly searchProjectsStore: SearchProjectsStore,
    private readonly jobMatchesStore: JobMatchesStore,
    private readonly interviewStore: InterviewStore,
    private readonly creditOrdersStore: CreditOrdersStore,
    private readonly auditStore: AdminAuditStore,
  ) {}

  getRetentionPolicy() {
    return PRIVACY_RETENTION_POLICY;
  }

  async exportUserData(userEmail: string): Promise<PrivacyExportPayload> {
    const normalizedEmail = normalizeEmail(userEmail);
    const auth = await this.authStore.exportUserData(normalizedEmail);

    if (!auth.account) {
      throw new UnauthorizedException("A valid session is required.");
    }

    return {
      adminGrantReferences:
        await this.creditsStore.listEntriesByAdminEmail(normalizedEmail),
      auth,
      exportedAt: new Date().toISOString(),
      notifications:
        await this.notificationsStore.listByUserEmail(normalizedEmail),
      ownedApplications:
        await this.applicationsStore.listByUserEmail(normalizedEmail),
      ownedCredits: await this.creditsStore.listEntriesForUser(normalizedEmail),
      ownedProfiles: await this.profilesStore.findByUserEmail(normalizedEmail),
      ownedSearchProjects:
        await this.searchProjectsStore.listByUserEmail(normalizedEmail),
      retentionPolicy: PRIVACY_RETENTION_POLICY,
      userEmail: normalizedEmail,
    };
  }

  async deleteUserData(
    userEmail: string,
    confirmationEmail: string,
  ): Promise<PrivacyDeletionSummary> {
    const normalizedEmail = normalizeEmail(userEmail);

    if (normalizeEmail(confirmationEmail) !== normalizedEmail) {
      throw new BadRequestException(
        "The confirmation email must match the authenticated account.",
      );
    }

    const exportSnapshot = await this.authStore.exportUserData(normalizedEmail);

    if (!exportSnapshot.account) {
      throw new UnauthorizedException("A valid session is required.");
    }

    return this.purgeAccount(normalizedEmail);
  }

  async purgeAccount(userEmail: string): Promise<PrivacyDeletionSummary> {
    const normalizedEmail = normalizeEmail(userEmail);
    const deletedApplications =
      await this.applicationsStore.deleteByUserEmail(normalizedEmail);
    const deletedNotifications =
      await this.notificationsStore.deleteByUserEmail(normalizedEmail);
    const deletedProfiles =
      await this.profilesStore.deleteByUserEmail(normalizedEmail);
    const deletedJobMatches =
      await this.jobMatchesStore.deleteByUserEmail(normalizedEmail);
    const deletedSearchProjects =
      await this.searchProjectsStore.deleteByUserEmail(normalizedEmail);
    const deletedCreditEntries =
      await this.creditsStore.deleteByUserEmail(normalizedEmail);
    // Sessions carry the interview transcripts; the chunks cascade with them.
    const deletedInterviewSessions =
      await this.interviewStore.deleteByUserEmail(normalizedEmail);
    // Settled payments stay as accounting records, minus the buyer's identity.
    const anonymizedCreditOrders =
      await this.creditOrdersStore.anonymizeUserEmail(normalizedEmail);
    // The admin actions stay auditable; their target does not stay named.
    const scrubbedAuditEntries =
      await this.auditStore.scrubTarget(normalizedEmail);
    const scrubbedAdminReferences =
      await this.creditsStore.anonymizeAdminReferences(normalizedEmail);
    const authSummary = await this.authStore.purgeUserData(normalizedEmail);

    return {
      anonymizedCreditOrders,
      deletedApplications,
      deletedAt: new Date().toISOString(),
      deletedInterviewSessions,
      deletedAuthAccount: authSummary.accountDeleted,
      deletedCreditEntries,
      deletedInvitations: authSummary.invitationsRemoved,
      deletedNotifications,
      deletedProfiles,
      deletedJobMatches,
      deletedSearchProjects,
      scrubbedThirdPartyReferences:
        scrubbedAdminReferences +
        authSummary.invitationsScrubbed +
        scrubbedAuditEntries,
      userEmail: normalizedEmail,
    };
  }
}
