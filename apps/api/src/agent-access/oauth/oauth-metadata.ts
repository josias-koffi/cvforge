import { OAUTH_SCOPES_SUPPORTED } from "./oauth-rules";
import type { OAuthConfig } from "./oauth.config";

/** RFC 9728: what `/mcp` is and who issues tokens for it. */
export function protectedResourceMetadata(config: OAuthConfig) {
  return {
    authorization_servers: [config.issuer],
    bearer_methods_supported: ["header"],
    resource: config.mcpUrl,
    resource_documentation: `${config.appUrl}/compte/agents`,
    resource_name: "JobSpark",
    scopes_supported: OAUTH_SCOPES_SUPPORTED,
  };
}

/**
 * RFC 8414. `client_id_metadata_document_supported` with auth method `none`
 * is what makes Claude and ChatGPT use CIMD; the `iss` flag (RFC 9207) is
 * what unlocks ChatGPT's stable redirect URI.
 */
export function authorizationServerMetadata(config: OAuthConfig) {
  return {
    authorization_endpoint: `${config.issuer}/oauth/authorize`,
    authorization_response_iss_parameter_supported: true,
    client_id_metadata_document_supported: true,
    code_challenge_methods_supported: ["S256"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    issuer: config.issuer,
    registration_endpoint: `${config.issuer}/oauth/register`,
    response_types_supported: ["code"],
    revocation_endpoint: `${config.issuer}/oauth/revoke`,
    revocation_endpoint_auth_methods_supported: ["none"],
    scopes_supported: OAUTH_SCOPES_SUPPORTED,
    service_documentation: `${config.appUrl}/compte/agents`,
    token_endpoint: `${config.issuer}/oauth/token`,
    token_endpoint_auth_methods_supported: ["none"],
  };
}
