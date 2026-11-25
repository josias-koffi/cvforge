# ADR-032: An MCP server lets a candidate plug in their own agent

Date: 2026-11-25
Status: accepted

Out of the vision — owner request of 2026-11-25 (epic E32).

## Context

The owner wants to drive JobSpark from their own agent (Claude Code, with
the Claude in Chrome extension): read and enrich the profile (detail and
quantify experiences), browse offers and the latest alerts, create an
application, generate the CV and the cover letter, download them, check the
credit balance — then apply on the recruiter's site through Chrome. The API
only knows a signed session cookie; there are no API tokens and no scopes.

## Decision

1. **Protocol: MCP**, official TypeScript SDK `@modelcontextprotocol/sdk`
   (MIT, already in the lockfile through a transitive dependency), with its
   peer `zod`. Not a framework: one `McpServer` per request, tools declared
   with zod schemas.
2. **Transport: Streamable HTTP, stateless**, mounted in the NestJS API at
   `POST /mcp` (`sessionIdGenerator: undefined`, JSON responses). `GET` and
   `DELETE /mcp` answer 405. No stdio package to install for the user.
3. **Auth: personal agent tokens** created by the user in
   `/compte/agents`: `jsk_` + 32 random bytes, only the SHA-256 is stored,
   shown once, scoped, expiring (30 days by default, 90 at most), revocable.
   The token opens **only `/mcp`**: `SessionGuard` never reads
   `Authorization`. A suspended account or "log out everywhere"
   (`sessions_valid_from`) also refuses its tokens. OAuth 2.1 (claude.ai and
   ChatGPT connectors) is left for later.
4. **Scopes**: `profile:read`, `profile:write`, `jobs:read`,
   `applications:read`, `applications:write`, `documents:generate`,
   `notifications:read`, `credits:read`. A token always acts as a plain user,
   even for an admin account. Never exposed: admin, account deletion, data
   export, buying credits, sending e-mail (the candidate sends, ADR-028),
   token management, voice interview.
5. **Credits**: each token carries a daily cap. Paid tools reserve the cost
   atomically on the token before the call and give it back on failure; the
   real balance is still checked by `CreditsService`. Which token spent what
   is in the agent log (`agent_tool_calls.credits_spent`); the credit ledger
   itself is unchanged.
6. **Pseudonymisation is unchanged**: the generation request is built on the
   server with the same `buildGenerationRequest` the web app uses (moved to
   `@cvforge/types`). Rewriting experiences is done by the user's agent with
   free read/write profile tools; JobSpark adds no AI endpoint for it.
7. **Untrusted content**: offer texts come from third-party sites and are
   returned wrapped in `<untrusted_offer_content>`; the server instructions
   tell the agent not to follow instructions found inside. No tool deletes
   anything.
8. **Files**: the agent gets a signed download URL (HMAC, 10 minutes, one
   use, bound to the account) for the PDF/DOCX, which it saves locally and
   uploads through Chrome.
9. **Audit**: `agent_tool_calls` (token, tool, outcome, credits, duration),
   no payload, shown to the user, purged after 90 days.

## Consequences

- The user's profile data, identifiers included, reach the agent the user
  chose. The token creation screen says so and the privacy policy must
  mention it (owner to update in `/admin/legal`).
- Rate limits: per token (calls per minute and per day) in the existing
  in-memory store, on top of the per-account AI limits.
- One more public surface: `/mcp` caps the body at 1 MB and refuses a
  request whose `Origin` is present but not in `MCP_ALLOWED_ORIGINS`
  (comma-separated; empty by default). Claude Code sends no `Origin`; a
  future JobSpark Chrome extension (E33) sends `chrome-extension://<id>`,
  made stable by the manifest `key`, and is added to that list.
- **No CORS on `/mcp`, on purpose**: no web page should call it with a
  token. An extension calls it from its service worker with
  `host_permissions` on the API domain, which bypasses CORS, so the token
  never goes through a page. This stays compatible with E33.

## Alternatives considered

- **Reuse the session cookie** in the agent: no scopes, no cap, a stolen
  cookie opens the whole account. Rejected.
- **A public REST API + OpenAPI**: agents would need a custom wrapper; MCP
  is what Claude Code speaks natively.
- **OAuth 2.1 first**: needed for web connectors, but an authorization
  server with dynamic client registration is a sprint of its own.
- **A stdio MCP package** published on npm: one more thing for the user to
  install and update; the HTTP endpoint needs nothing.
