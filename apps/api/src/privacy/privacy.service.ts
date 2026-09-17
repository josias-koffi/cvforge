import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { ApplicationsStore } from "../applications/applications.types";
import type { AuthAccountStore } from "../auth/auth.types";
import type { CreditLedgerStore } from "../credits/credits.types";
import type { NotificationsStore } from "../notifications/notifications.types";
import type { ProfilesStore } from "../profiles/profiles.types";
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
  ) {}

  getRetentionPolicy() {
    return PRIVACY_RETENTION_POLICY;
  }

  async exportUserData(userEmail: string): Promise<PrivacyExportPayload> {
    const normalizedEmail = normalizeEmail(userEmail);
    const auth = this.authStore.exportUserData(normalizedEmail);

    if (!auth.account) {
      throw new UnauthorizedException("A valid session is required.");
    }

    return {
      adminGrantReferences:
        await this.creditsStore.listEntriesByAdminEmail(normalizedEmail),
      auth,
      exportedAt: new Date().toISOString(),
      notifications: this.notificationsStore.listByUserEmail(normalizedEmail),
      ownedApplications: this.applicationsStore.listByUserEmail(normalizedEmail),
      ownedCredits: await this.creditsStore.listEntriesForUser(normalizedEmail),
      ownedProfiles: this.profilesStore.findByUserEmail(normalizedEmail),
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

    const exportSnapshot = this.authStore.exportUserData(normalizedEmail);

    if (!exportSnapshot.account) {
      throw new UnauthorizedException("A valid session is required.");
    }

    return this.purgeAccount(normalizedEmail);
  }

  async purgeAccount(userEmail: string): Promise<PrivacyDeletionSummary> {
    const normalizedEmail = normalizeEmail(userEmail);
    const deletedApplications = this.applicationsStore.deleteByUserEmail(normalizedEmail);
    const deletedNotifications = this.notificationsStore.deleteByUserEmail(normalizedEmail);
    const deletedProfiles = this.profilesStore.deleteByUserEmail(normalizedEmail);
    const deletedCreditEntries =
      await this.creditsStore.deleteByUserEmail(normalizedEmail);
    const scrubbedAdminReferences =
      await this.creditsStore.anonymizeAdminReferences(normalizedEmail);
    const authSummary = this.authStore.purgeUserData(normalizedEmail);

    return {
      deletedApplications,
      deletedAt: new Date().toISOString(),
      deletedAuthAccount: authSummary.accountDeleted,
      deletedCreditEntries,
      deletedInvitations: authSummary.invitationsRemoved,
      deletedNotifications,
      deletedProfiles,
      scrubbedThirdPartyReferences:
        scrubbedAdminReferences + authSummary.invitationsScrubbed,
      userEmail: normalizedEmail,
    };
  }
}
