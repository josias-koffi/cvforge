import type { AuthExportSnapshot } from "../auth/auth.types";
import type { StoredApplication } from "../applications/applications.types";
import type { StoredProfileRegistry } from "../profiles/profiles.types";
import type {
  CreditLedgerEntry,
  InAppNotification,
  SearchProject,
} from "@cvforge/types";

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
  auth: AuthExportSnapshot;
  ownedApplications: StoredApplication[];
  ownedCredits: CreditLedgerEntry[];
  ownedProfiles: StoredProfileRegistry | null;
  ownedSearchProjects: SearchProject[];
  notifications: InAppNotification[];
  adminGrantReferences: CreditLedgerEntry[];
  retentionPolicy: PrivacyRetentionPolicy;
};

export type PrivacyDeletionSummary = {
  deletedAt: string;
  /** Kept as accounting records with the buyer's identity removed. */
  anonymizedCreditOrders: number;
  deletedApplications: number;
  deletedInterviewSessions: number;
  deletedAuthAccount: boolean;
  deletedCreditEntries: number;
  deletedNotifications: number;
  deletedProfiles: number;
  deletedJobMatches: number;
  deletedSearchProjects: number;
  deletedInvitations: number;
  scrubbedThirdPartyReferences: number;
  userEmail: string;
};
