import type { AuthAccountRecord, AuthInvitation } from "../auth/auth.types";
import type { StoredApplication } from "../applications/applications.types";
import type { CreditLedgerEntry } from "@cvforge/types";
import type { InAppNotification } from "@cvforge/types";

export type PrivacyRetentionRule = {
  action: string;
  automation: string;
  dataType: string;
  retention: string;
};

export type PrivacyRetentionPolicy = {
  audioPurgePlan: {
    execution: string;
    retentionDays: number;
    scope: string;
    status: "planned" | "implemented";
  };
  documentedAt: string;
  rules: PrivacyRetentionRule[];
};

export type PrivacyExportPayload = {
  exportedAt: string;
  userEmail: string;
  auth: {
    account: AuthAccountRecord | null;
    issuedInvitations: Array<AuthInvitation & { tokenHash: string }>;
    receivedInvitations: Array<AuthInvitation & { tokenHash: string }>;
  };
  ownedApplications: StoredApplication[];
  ownedCredits: CreditLedgerEntry[];
  notifications: InAppNotification[];
  adminGrantReferences: CreditLedgerEntry[];
  retentionPolicy: PrivacyRetentionPolicy;
};

export type PrivacyDeletionSummary = {
  deletedAt: string;
  deletedApplications: number;
  deletedAuthAccount: boolean;
  deletedCreditEntries: number;
  deletedNotifications: number;
  deletedInvitations: number;
  scrubbedThirdPartyReferences: number;
  userEmail: string;
};
