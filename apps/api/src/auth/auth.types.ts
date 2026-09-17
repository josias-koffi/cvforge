import type { AccountStatus } from "@cvforge/types";
export type AuthConsentRecord = {
  acceptedAt: string;
  source: "invitation" | "passwordless";
  version: string;
};

export type AuthAccount = {
  consent: AuthConsentRecord | null;
  role: AuthRole;
  status: AccountStatus;
  /** Sessions issued before this instant are refused. Null means none revoked. */
  sessionsValidFrom: string | null;
};

/** The two fields the per-request session check needs, and nothing else. */
export type AuthAccountState = {
  sessionsValidFrom: string | null;
  status: AccountStatus;
};

export type AuthAccountRecord = AuthAccount & {
  email: string;
};

export type AuthConfig = {
  apiUrl: string;
  appUrl: string;
  magicLinkTtlMinutes: number;
  sessionTtlDays: number;
  cookieName: string;
  cookieDomain: string | undefined;
  sessionSecret: string;
  secureCookies: boolean;
};

export type AuthRole = "admin" | "user";

export type AuthInvitation = {
  email: string;
  role: AuthRole;
  createdAt: string;
  createdBy: string;
  expiresAt: string;
  consumedAt: string | null;
};

export type AuthSession = {
  email: string;
  role: AuthRole;
  issuedAt: string;
  expiresAt: string;
};

export type MagicLinkResponse = {
  email: string;
  magicLink: string;
  expiresAt: string;
  sessionDurationDays: number;
};

export type InvitationResponse = {
  email: string;
  role: AuthRole;
  invitationUrl: string;
  expiresAt: string;
};

/** Everything the GDPR export hands back about one account. */
export type AuthExportSnapshot = {
  account: AuthAccountRecord | null;
  issuedInvitations: Array<AuthInvitation & { tokenHash: string }>;
  receivedInvitations: Array<AuthInvitation & { tokenHash: string }>;
};

export type PurgedAuthAccountSummary = {
  accountDeleted: boolean;
  invitationsRemoved: number;
  invitationsScrubbed: number;
};

/** DI token for the account store, so services depend on this type, not a class. */
export const AUTH_ACCOUNT_STORE = Symbol("AUTH_ACCOUNT_STORE");

export type AuthAccountStore = {
  listAccounts: () => Promise<AuthAccountRecord[]>;
  readAccount: (email: string) => Promise<AuthAccount | null>;
  /**
   * Demotion only. There is deliberately no store method that grants `admin`
   * to an existing account: vision §3.2 reserves the role for the nominative
   * invitation link, so `assignInvitedRole` and the one-shot bootstrap in
   * `resolveRole` are the only ways in.
   */
  demoteToUser: (email: string) => Promise<AuthAccountRecord | null>;
  readAccountState: (email: string) => Promise<AuthAccountState | null>;
  /** Suspends or reactivates; suspending also revokes live sessions. */
  setAccountStatus: (
    email: string,
    status: AccountStatus,
    sessionsValidFrom: string | null,
  ) => Promise<AuthAccountRecord | null>;
  revokeSessions: (
    email: string,
    sessionsValidFrom: string,
  ) => Promise<AuthAccountRecord | null>;
  resolveRole: (
    email: string,
    consent?: AuthConsentRecord | null,
  ) => Promise<AuthRole>;
  assignInvitedRole: (
    email: string,
    role: AuthRole,
    consent: AuthConsentRecord,
  ) => Promise<AuthRole>;
  readInvitation: (tokenHash: string) => Promise<AuthInvitation | null>;
  saveInvitation: (
    tokenHash: string,
    invitation: AuthInvitation,
  ) => Promise<void>;
  consumeInvitation: (
    tokenHash: string,
    consumedAt: string,
    now: number,
  ) => Promise<AuthInvitation | null>;
  exportUserData: (email: string) => Promise<AuthExportSnapshot>;
  purgeUserData: (email: string) => Promise<PurgedAuthAccountSummary>;
};
