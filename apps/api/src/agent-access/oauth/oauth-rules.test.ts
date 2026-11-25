import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  isAllowedRedirectUri,
  readScopes,
  redirectUriMatches,
  resourceMatches,
  verifierMatches,
} from "./oauth-rules";

describe("OAuth rules", () => {
  it("allows https and loopback http redirects only, never a fragment", () => {
    expect(
      isAllowedRedirectUri("https://claude.ai/api/mcp/auth_callback"),
    ).toBe(true);
    expect(isAllowedRedirectUri("http://127.0.0.1:8123/callback")).toBe(true);
    expect(isAllowedRedirectUri("http://localhost/callback")).toBe(true);
    expect(isAllowedRedirectUri("http://evil.example/callback")).toBe(false);
    expect(isAllowedRedirectUri("https://claude.ai/cb#x")).toBe(false);
    expect(isAllowedRedirectUri("javascript:alert(1)")).toBe(false);
  });

  it("matches redirects exactly, except the port of a loopback one", () => {
    const claude = "https://claude.ai/api/mcp/auth_callback";
    expect(redirectUriMatches(claude, claude)).toBe(true);
    expect(redirectUriMatches(claude, `${claude}/`)).toBe(false);
    expect(
      redirectUriMatches(
        claude,
        "https://claude.ai.evil.example/api/mcp/auth_callback",
      ),
    ).toBe(false);
    expect(
      redirectUriMatches(
        "http://127.0.0.1:3000/callback",
        "http://127.0.0.1:54123/callback",
      ),
    ).toBe(true);
    expect(
      redirectUriMatches(
        "http://127.0.0.1/callback",
        "http://localhost:54123/callback",
      ),
    ).toBe(false);
    expect(
      redirectUriMatches(
        "http://127.0.0.1/callback",
        "http://127.0.0.1:5/other",
      ),
    ).toBe(false);
  });

  it("checks the PKCE verifier against an S256 challenge", () => {
    const verifier = "a".repeat(43);
    const challenge = createHash("sha256").update(verifier).digest("base64url");

    expect(verifierMatches(verifier, challenge)).toBe(true);
    expect(verifierMatches("b".repeat(43), challenge)).toBe(false);
    expect(verifierMatches("short", challenge)).toBe(false);
    expect(verifierMatches(undefined, challenge)).toBe(false);
  });

  it("accepts our resource with or without a trailing slash, or none", () => {
    const mcp = "https://api.example/mcp";
    expect(resourceMatches(undefined, mcp)).toBe(true);
    expect(resourceMatches("https://api.example/mcp/", mcp)).toBe(true);
    expect(resourceMatches("https://other.example/mcp", mcp)).toBe(false);
  });

  it("keeps known scopes only", () => {
    expect(
      readScopes("openid jobs:read offline_access jobs:read profile:write"),
    ).toEqual(["jobs:read", "profile:write"]);
    expect(readScopes(undefined)).toEqual([]);
  });
});
