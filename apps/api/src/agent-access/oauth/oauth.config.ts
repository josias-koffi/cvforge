import { resolveAuthConfig } from "../../auth/auth.config";

/** DI token for the resolved OAuth configuration (ADR-033). */
export const OAUTH_CONFIG = Symbol("OAUTH_CONFIG");

export type OAuthConfig = {
  /** Our authorization server identifier: the API origin, no trailing slash. */
  issuer: string;
  /** The protected resource, exactly as users paste it in their agent. */
  mcpUrl: string;
  /** Where the consent page lives (the web app). */
  appUrl: string;
  sessionSecret: string;
};

export const OAUTH_ACCESS_TOKEN_TTL_S = 60 * 60;
export const OAUTH_GRANT_TTL_DAYS = 30;
export const OAUTH_CODE_TTL_MS = 10 * 60 * 1000;
export const OAUTH_REQUEST_TTL_MS = 10 * 60 * 1000;

export function resolveOAuthConfig(env: NodeJS.ProcessEnv): OAuthConfig {
  const auth = resolveAuthConfig(env);
  const issuer = auth.apiUrl.replace(/\/$/, "");

  return {
    appUrl: auth.appUrl.replace(/\/$/, ""),
    issuer,
    mcpUrl: `${issuer}/mcp`,
    sessionSecret: auth.sessionSecret,
  };
}

export function protectedResourceMetadataUrl(config: OAuthConfig) {
  return `${config.issuer}/.well-known/oauth-protected-resource/mcp`;
}
