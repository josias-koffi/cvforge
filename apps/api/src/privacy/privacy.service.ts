import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { FileApplicationsStore } from "../applications/applications.store";
import { FileAuthAccountStore } from "../auth/auth-account-store";
import { FileCreditLedgerStore } from "../credits/credits.store";
import { FileNotificationsStore } from "../notifications/notifications.store";
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
    private readonly authStore: FileAuthAccountStore,
    private readonly applicationsStore: FileApplicationsStore,
    private readonly creditsStore: FileCreditLedgerStore,
    private readonly notificationsStore: FileNotificationsStore,
  ) {}

  getRetentionPolicy() {
    return PRIVACY_RETENTION_POLICY;
  }

  exportUserData(userEmail: string): PrivacyExportPayload {
    const normalizedEmail = normalizeEmail(userEmail);
    const auth = this.authStore.exportUserData(normalizedEmail);

    if (!auth.account) {
      throw new UnauthorizedException("A valid session is required.");
    }

    return {
      adminGrantReferences: this.creditsStore.listEntriesByAdminEmail(normalizedEmail),
      auth,
      exportedAt: new Date().toISOString(),
      notifications: this.notificationsStore.listByUserEmail(normalizedEmail),
      ownedApplications: this.applicationsStore.listByUserEmail(normalizedEmail),
      ownedCredits: this.creditsStore.listEntriesForUser(normalizedEmail),
      retentionPolicy: PRIVACY_RETENTION_POLICY,
      userEmail: normalizedEmail,
    };
  }

  deleteUserData(
    userEmail: string,
    confirmationEmail: string,
  ): PrivacyDeletionSummary {
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

    const deletedApplications = this.applicationsStore.deleteByUserEmail(normalizedEmail);
    const deletedNotifications = this.notificationsStore.deleteByUserEmail(normalizedEmail);
    const deletedCreditEntries = this.creditsStore.deleteByUserEmail(normalizedEmail);
    const scrubbedAdminReferences =
      this.creditsStore.anonymizeAdminReferences(normalizedEmail);
    const authSummary = this.authStore.purgeUserData(normalizedEmail);

    return {
      deletedApplications,
      deletedAt: new Date().toISOString(),
      deletedAuthAccount: authSummary.accountDeleted,
      deletedCreditEntries,
      deletedInvitations: authSummary.invitationsRemoved,
      deletedNotifications,
      scrubbedThirdPartyReferences:
        scrubbedAdminReferences + authSummary.invitationsScrubbed,
      userEmail: normalizedEmail,
    };
  }
}
