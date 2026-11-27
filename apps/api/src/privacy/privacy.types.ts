import type { AgentAccessExport } from "./agent-access-export.pg-store";
import type { ApplicationSubmission, ScreeningAnswers } from "@cvforge/types";
import type { AuthExportSnapshot } from "../auth/auth.types";
import type { StoredApplication } from "../applications/applications.types";
import type { ExportedProfileCompetence } from "../profiles/profile-competences.pg-store";
import type { StoredProfileRegistry } from "../profiles/profiles.types";
import type { ExportedSearchJob } from "../search-projects/search-project-rome.pg-store";
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
  /** The ROME jobs of each search: suggested, confirmed or dismissed (US-118). */
  ownedSearchJobs: ExportedSearchJob[];
  /** The ROME competences read in each profile's CV, dismissed ones included. */
  ownedProfileCompetences: ExportedProfileCompetence[];
  notifications: InAppNotification[];
  adminGrantReferences: CreditLedgerEntry[];
  /** Saved answers to recruiters' screening questions (US-197). */
  screeningAnswers: ScreeningAnswers | null;
  /** Proof of the applications the extension sent, screenshots included (US-198). */
  submissions: (ApplicationSubmission & { screenshotBase64: string | null })[];
  /** Agent tokens and actions, form fills and form map votes (E32, E33). */
  agentAccess: AgentAccessExport;
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
