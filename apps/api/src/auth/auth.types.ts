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
  stateFilePath: string;
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
 * A pending magic link. Persisted, not held in memory: the process restarts on
 * every deploy, and an in-memory map silently invalidated every link that had
 * already been emailed.
 */
export type AuthMagicLink = {
  consent: AuthConsentRecord | null;
  email: string;
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

export type AuthAccountStore = {
  listAccounts: () => AuthAccountRecord[];
  readAccount: (email: string) => AuthAccount | null;
  updateRole: (email: string, role: AuthRole) => AuthAccountRecord | null;
  resolveRole: (email: string, consent?: AuthConsentRecord | null) => AuthRole;
  assignInvitedRole: (
    email: string,
    role: AuthRole,
    consent: AuthConsentRecord,
  ) => AuthRole;
  readInvitation: (tokenHash: string) => AuthInvitation | null;
  saveInvitation: (tokenHash: string, invitation: AuthInvitation) => void;
  consumeInvitation: (
    tokenHash: string,
    consumedAt: string,
    now: number,
  ) => AuthInvitation | null;
  saveMagicLink: (tokenHash: string, magicLink: AuthMagicLink) => void;
  /** Marks the link consumed and returns it, or null if unknown, already used or expired. */
  consumeMagicLink: (
    tokenHash: string,
    consumedAt: string,
    now: number,
  ) => AuthMagicLink | null;
  pruneMagicLinks: (now: number) => void;
};
