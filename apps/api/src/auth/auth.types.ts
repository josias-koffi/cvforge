import type { AccountStatus, LeadIntent } from "@cvforge/types";

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

/**
 * A pending magic link. Only unspent links exist: consuming one deletes it,
 * so there is no `consumedAt` to read.
 */
export type AuthMagicLink = {
  consent: AuthConsentRecord | null;
  email: string;
  expiresAt: string;
  /** What a free tool's visitor asked for, applied on redemption (US-133). */
  intent?: LeadIntent | null;
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
  /** Pending links carry the address, so they leave with the account. */
  magicLinksRemoved: number;
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
  saveMagicLink: (tokenHash: string, link: AuthMagicLink) => Promise<void>;
  /**
   * Redeems a link and removes it in one write, so two simultaneous clicks on
   * the same link cannot both open a session. Returns null when the link is
   * unknown or expired.
   */
  consumeMagicLink: (
    tokenHash: string,
    now: number,
  ) => Promise<AuthMagicLink | null>;
  /** Drops links nobody can use any more. Returns how many were removed. */
  purgeExpiredMagicLinks: (now: number) => Promise<number>;
  exportUserData: (email: string) => Promise<AuthExportSnapshot>;
  purgeUserData: (email: string) => Promise<PurgedAuthAccountSummary>;
};
