export type AuthConsentRecord = {
  acceptedAt: string;
  source: "invitation" | "passwordless";
  version: string;
};

export type AuthAccount = {
  consent: AuthConsentRecord | null;
  role: AuthRole;
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
  updateRole: (
    email: string,
    role: AuthRole,
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
