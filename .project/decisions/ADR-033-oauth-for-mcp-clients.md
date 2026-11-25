# ADR-033: Agents connect to the MCP server with OAuth

Date: 2026-11-25
Status: accepted

Extends ADR-032. Owner request of 2026-11-25: "je veux pouvoir me connecter
à Claude en ligne, ou tout autre agent".

## Context

ADR-032 admits agents with a personal token sent as
`Authorization: Bearer jsk_…`. That works for clients where the user can set
a header (Claude Code, Claude Desktop config, Cursor). It does not work for
the clients most users have:

- **claude.ai custom connectors** (web, Desktop app, mobile): a URL plus
  OAuth only. The header mode is a limited beta, shared per organisation.
- **ChatGPT** (developer mode / Apps): OAuth only, no API keys.
- Other spec clients (VS Code, Cursor, Le Chat…) follow the MCP authorization
  spec, i.e. OAuth.

What the MCP authorization spec (2025-11-25) and these clients require,
checked on 2026-11-25:

- The MCP server is an OAuth **resource server**:
  - it answers 401 with
    `WWW-Authenticate: Bearer resource_metadata="…", scope="…"`;
  - it serves Protected Resource Metadata (RFC 9728) at
    `/.well-known/oauth-protected-resource/mcp`;
  - it accepts only tokens issued for `https://<api>/mcp` (RFC 8707).
- An **authorization server** (AS) with RFC 8414 metadata:
  - OAuth 2.1, authorization code with PKCE S256 only;
  - `resource` honoured on the authorize and token requests;
  - refresh tokens that rotate.
- **Client registration**, in the order clients try it:
  - **CIMD** (client ID metadata document: the `client_id` is an https URL
    the AS fetches) is now the recommended way. Claude uses it when the
    metadata says `client_id_metadata_document_supported: true` with auth
    method `none`; ChatGPT too.
  - **DCR** (RFC 7591) is the fallback.
- ChatGPT's stable redirect URI requires RFC 9207: `iss` on every
  authorization response.
- Redirect URIs to accept:
  - `https://claude.ai/api/mcp/auth_callback`;
  - `https://chatgpt.com/connector_platform_oauth_redirect` (or the
    per-app `https://chatgpt.com/connector/oauth/{id}`);
  - loopback `http://127.0.0.1:<any port>/callback` and `localhost` for
    Claude Code and other desktop clients.
- Claude's traffic, including calls to the AS, comes from `160.79.104.0/21`.

The SDK we use (`@modelcontextprotocol/sdk` 1.x, Express) ships an AS
(`mcpAuthRouter`). It does DCR but not CIMD, nor RFC 9207. In v2 that AS is
moved to a frozen "legacy" package.

## Decision

1. **JobSpark is its own authorization server**, inside the NestJS API. No
   external IdP: the users, the passwordless sign-in, the scopes and the
   credit cap already live here. A second identity system would have to
   mirror all of them.
2. **Endpoints** (API domain):
   - `GET /.well-known/oauth-protected-resource/mcp`: PRM, listing our AS.
   - `GET /.well-known/oauth-authorization-server`: RFC 8414 metadata.
     It advertises S256, `none` + `client_secret_post`,
     `client_id_metadata_document_supported`,
     `authorization_response_iss_parameter_supported` and the scopes,
     `offline_access` included.
   - `GET /oauth/authorize`: validates the client, the redirect URI, PKCE
     and `resource`, then sends the browser to the **consent page in the
     app** with a signed, short-lived request.
   - `POST /oauth/consent` (cookie session, called by the app): records the
     user's choice and returns the redirect with `code`, `state` and `iss`.
   - `POST /oauth/token`: form-encoded. Handles `authorization_code` (with
     PKCE verifier, redirect URI and `resource` checked) and
     `refresh_token` (with rotation and reuse detection: a reused refresh
     token revokes the whole grant).
   - `POST /oauth/register`: DCR, public clients only, redirect URIs from
     the allow-list rules below.
   - `POST /oauth/revoke`.
3. **CIMD**:
   - A `client_id` that is an https URL is fetched with the existing
     `shared/safe-fetch` (no private addresses, timeout, size cap), cached
     for 24 h.
   - Its `redirect_uris` must contain the requested one.
   - The consent page shows the client name and the redirect host.
4. **Redirect URIs**: exact match, except that a loopback host
   (`127.0.0.1`, `localhost`, `[::1]`) over http matches any port. Every
   other redirect must be https.
5. **Consent page** `/autoriser-agent` (app):
   - It shows who asks (client name and redirect host), what for (scopes
     in plain French) and the daily credit cap to grant (default 20).
   - It uses the existing session; if signed out, the user signs in by
     magic link, then comes back.
   - Accept or Refuse. Refuse returns `access_denied` to the client.
6. **Tokens stay ours and opaque**:
   - The access token is an agent token (`agent_tokens`): hashed, scoped,
     capped, logged, revocable in `/compte/agents`, valid 1 h. It is bound
     to the resource and the OAuth client.
   - The refresh token is valid 30 days and rotates.
   - An OAuth connection appears in `/compte/agents` like a token, named
     after its client ("Claude", "ChatGPT"…); revoking it ends the grant.
   - No JWT: one database lookup per call is already what `/mcp` does, and
     revocation stays immediate.
7. **`/mcp` becomes a spec resource server**:
   - A missing or invalid token gets 401 with the `WWW-Authenticate`
     challenge, instead of a bare 401.
   - Insufficient scope gets 403 `insufficient_scope`.
   - Personal `jsk_` tokens keep working: they are just agent tokens
     created by hand.
8. **Network and limits**:
   - The `/oauth/*` endpoints get IP rate limits in `rate-limit.policies.ts`.
   - No IP allow-list: claude.ai is one client among others.
9. **Not in scope**:
   - `client_credentials`, JWT access tokens, OIDC `id_token` (no sign-in
     *with* JobSpark), mTLS.
   - The future Chrome extension (E33) may use this flow
     (`chrome.identity.launchWebAuthFlow`, redirect
     `https://<extension id>.chromiumapp.org/`), but that stays its own
     decision. It would need a stable extension id (manifest `key`), the
     same one listed in `MCP_ALLOWED_ORIGINS`.

## Consequences

- One more public surface, the most sensitive one (it issues tokens). It
  needs:
  - tests for each RFC rule (PKCE, exact redirect, resource, refresh reuse);
  - an end-to-end check with claude.ai and ChatGPT before opening it.
- The privacy policy must name the OAuth clients as possible recipients
  (same paragraph as ADR-032, extended).
- Claude registers a new DCR client on each connection when CIMD is not
  used: DCR clients without any grant are purged after 30 days.

## Alternatives considered

- **SDK `mcpAuthRouter`**: quickest, but no CIMD (now the recommended
  path), no RFC 9207 (required by ChatGPT's stable redirect), Express-only,
  and frozen in v2.
- **`oidc-provider` (panva)**: a certified, complete AS. But it is Koa-based,
  needs its own storage adapter and session UI, and would still need CIMD
  added by hand. Heavier than the six endpoints needed here.
- **An external IdP** (Keycloak, Ory, Auth0, Logto): a second user base to
  keep in sync with the passwordless sign-in, the scopes and the per-token
  credit cap. Too much for one MCP endpoint.
- **Token in the URL** for claude.ai: rejected. The secret would end up in
  logs and history, and leaking the URL gives access until revoked.
