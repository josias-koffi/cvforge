import { createHash } from "node:crypto";
import { AGENT_SCOPES, isAgentScope, type AgentScope } from "@cvforge/types";

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);
/** RFC 7636 §4.1: 43 to 128 unreserved characters. */
const CODE_VERIFIER = /^[A-Za-z0-9._~-]{43,128}$/;
const CODE_CHALLENGE = /^[A-Za-z0-9_-]{43}$/;

export const OAUTH_SCOPES_SUPPORTED = [...AGENT_SCOPES, "offline_access"];

function parse(uri: string) {
  try {
    return new URL(uri);
  } catch {
    return null;
  }
}

function isLoopback(url: URL) {
  return url.protocol === "http:" && LOOPBACK_HOSTS.has(url.hostname);
}

/**
 * A redirect a client may register: https, or http on a loopback address for
 * desktop clients (RFC 8252 §7.3). Never a fragment.
 */
export function isAllowedRedirectUri(uri: string) {
  const url = parse(uri);

  return Boolean(
    url && !url.hash && (url.protocol === "https:" || isLoopback(url)),
  );
}

/**
 * Exact match (OAuth 2.1), except that a loopback redirect matches whatever
 * port the desktop client opened this time (RFC 8252 §7.3).
 */
export function redirectUriMatches(registered: string, requested: string) {
  if (registered === requested) {
    return true;
  }

  const a = parse(registered);
  const b = parse(requested);

  return Boolean(
    a &&
    b &&
    isLoopback(a) &&
    isLoopback(b) &&
    a.hostname === b.hostname &&
    a.pathname === b.pathname &&
    a.search === b.search,
  );
}

export function isCodeChallenge(value: unknown): value is string {
  return typeof value === "string" && CODE_CHALLENGE.test(value);
}

/** S256 only: `BASE64URL(SHA256(verifier)) === challenge`. */
export function verifierMatches(verifier: unknown, challenge: string) {
  return (
    typeof verifier === "string" &&
    CODE_VERIFIER.test(verifier) &&
    createHash("sha256").update(verifier).digest("base64url") === challenge
  );
}

/** The scopes we know, in a space-separated `scope`; others are dropped. */
export function readScopes(scope: unknown): AgentScope[] {
  if (typeof scope !== "string") {
    return [];
  }

  return [...new Set(scope.split(/\s+/).filter(isAgentScope))];
}

/** `resource` (RFC 8707) must name our MCP endpoint; a trailing slash is forgiven. */
export function resourceMatches(resource: unknown, mcpUrl: string) {
  if (resource === undefined || resource === null || resource === "") {
    return true;
  }

  return (
    typeof resource === "string" &&
    resource.replace(/\/$/, "") === mcpUrl.replace(/\/$/, "")
  );
}

/** Adds `error`, `state` and `iss` (RFC 9207) to a client's redirect URI. */
export function redirectWith(
  redirectUri: string,
  params: Record<string, string | undefined>,
) {
  const url = new URL(redirectUri);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, value);
  }

  return url.toString();
}
