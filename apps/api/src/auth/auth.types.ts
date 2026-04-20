export type AuthConsentRecord = {
  acceptedAt: string;
  source: "invitation" | "passwordless";
  version: string;
};

export type AuthAccount = {
  consent: AuthConsentRecord | null;
  role: AuthRole;
};

export type AuthConfig = {
  apiUrl: string;
  appUrl: string;
  magicLinkTtlMinutes: number;
  sessionTtlDays: number;
  cookieName: string;
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
  readAccount: (email: string) => AuthAccount | null;
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
};
