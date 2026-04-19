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

export type AuthAccountStore = {
  resolveRole: (email: string) => AuthRole;
};
