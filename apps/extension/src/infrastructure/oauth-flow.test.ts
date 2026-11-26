import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConnectionRevokedError } from "../application/session";
import { ChromeAuthorizer } from "./chrome-authorizer";
import { JobSparkMcp } from "./jobspark-mcp";
import type { KeyValueStore } from "./local-store";
import { ExtensionOAuthProvider } from "./oauth-provider";

const ORIGIN = "https://api.example";
const MCP = `${ORIGIN}/mcp`;
const REDIRECT = "https://iciahkakhljbapmhkjjgopacegifndha.chromiumapp.org/";

function memoryStore(): KeyValueStore & { data: Map<string, unknown> } {
  const data = new Map<string, unknown>();
  return {
    data,
    get: async <T>(key: string) => data.get(key) as T | undefined,
    remove: async (...keys) => keys.forEach((key) => data.delete(key)),
    set: async (key, value) => void data.set(key, value),
  };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });

/** JobSpark's OAuth endpoints (ADR-033), enough for the SDK client. */
function fakeAuthorizationServer() {
  const calls: { url: string; body: string }[] = [];
  const fetchFn = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input instanceof Request ? input.url : input));
      const body = init?.body ? String(init.body) : "";
      calls.push({ body, url: url.pathname });
      switch (url.pathname) {
        case "/.well-known/oauth-protected-resource/mcp":
          return json({ authorization_servers: [ORIGIN], resource: MCP });
        case "/.well-known/oauth-authorization-server":
          return json({
            authorization_endpoint: `${ORIGIN}/oauth/authorize`,
            code_challenge_methods_supported: ["S256"],
            issuer: ORIGIN,
            registration_endpoint: `${ORIGIN}/oauth/register`,
            response_types_supported: ["code"],
            revocation_endpoint: `${ORIGIN}/oauth/revoke`,
            token_endpoint: `${ORIGIN}/oauth/token`,
            token_endpoint_auth_methods_supported: ["none"],
          });
        case "/oauth/register":
          return json({ ...JSON.parse(body), client_id: "client-1" }, 201);
        case "/oauth/token":
          return json({
            access_token: "access-1",
            expires_in: 3600,
            refresh_token: "refresh-1",
            token_type: "Bearer",
          });
        case "/oauth/revoke":
          return new Response(null, { status: 200 });
        case "/mcp":
          return init?.headers && new Headers(init.headers).get("origin")
            ? json({ message: "Origine non autorisée." }, 403)
            : json({ error: "invalid_token" }, 401);
        default:
          return new Response("not found", { status: 404 });
      }
    },
  );
  return { calls, fetchFn: fetchFn as unknown as typeof fetch };
}

describe("OAuth from the extension", () => {
  let store: ReturnType<typeof memoryStore>;
  let provider: ExtensionOAuthProvider;
  let server: ReturnType<typeof fakeAuthorizationServer>;
  let consentUrl: URL | null;

  const authorizer = (answer: (url: URL) => string | undefined) =>
    new ChromeAuthorizer(
      provider,
      { mcpUrl: MCP, origin: ORIGIN },
      async (url) => {
        consentUrl = new URL(url);
        return answer(consentUrl);
      },
      server.fetchFn,
    );
  const approve = (url: URL) =>
    `${REDIRECT}?code=code-1&state=${url.searchParams.get("state")}&iss=${ORIGIN}`;

  beforeEach(() => {
    store = memoryStore();
    provider = new ExtensionOAuthProvider(store, REDIRECT);
    server = fakeAuthorizationServer();
    consentUrl = null;
  });

  it("registers, shows the consent page with the extension scope, and keeps the tokens", async () => {
    const auth = authorizer(approve);
    await auth.authorize();

    expect(await auth.isConnected()).toBe(true);
    expect(consentUrl?.searchParams.get("redirect_uri")).toBe(REDIRECT);
    expect(consentUrl?.searchParams.get("code_challenge_method")).toBe("S256");
    expect(consentUrl?.searchParams.get("resource")).toBe(MCP);
    const scope = consentUrl?.searchParams.get("scope") ?? "";
    expect(scope).toContain("applications:write");
    expect(scope).not.toContain("profile:write");

    const registration = JSON.parse(
      server.calls.find((call) => call.url === "/oauth/register")!.body,
    );
    expect(registration).toMatchObject({
      client_name: "Extension JobSpark",
      redirect_uris: [REDIRECT],
      token_endpoint_auth_method: "none",
    });
    // The PKCE verifier and state do not outlive the flow.
    expect(store.data.has("oauth.verifier")).toBe(false);
    expect(store.data.has("oauth.state")).toBe(false);
  });

  it("keeps nothing when the candidate refuses", async () => {
    const auth = authorizer(
      (url) =>
        `${REDIRECT}?error=access_denied&state=${url.searchParams.get("state")}`,
    );
    await expect(auth.authorize()).rejects.toThrow("Connexion refusée");
    expect(await auth.isConnected()).toBe(false);
    expect(store.data.has("oauth.verifier")).toBe(false);
  });

  it("refuses a response that does not carry our state", async () => {
    const auth = authorizer(() => `${REDIRECT}?code=stolen&state=other`);
    await expect(auth.authorize()).rejects.toThrow("inattendue");
    expect(await auth.isConnected()).toBe(false);
  });

  it("treats a closed consent window as a cancellation", async () => {
    await expect(authorizer(() => undefined).authorize()).rejects.toThrow(
      "annulée",
    );
  });

  it("revokes the grant on JobSpark when disconnecting", async () => {
    const auth = authorizer(approve);
    await auth.authorize();
    await auth.disconnect();

    const revoke = server.calls.find((call) => call.url === "/oauth/revoke");
    expect(new URLSearchParams(revoke?.body)).toEqual(
      new URLSearchParams({
        client_id: "client-1",
        token: "refresh-1",
        token_type_hint: "refresh_token",
      }),
    );
    expect(await auth.isConnected()).toBe(false);
  });

  it("reports a connection JobSpark no longer accepts, without opening a window", async () => {
    await authorizer(approve).authorize();
    const mcp = new JobSparkMcp(MCP, provider, "0.1.0", server.fetchFn);

    await expect(mcp.call("get_credit_balance")).rejects.toBeInstanceOf(
      ConnectionRevokedError,
    );
    expect(provider.pendingAuthorizationUrl).toBeNull();
  });

  it("says so when the server does not allow the extension's origin yet", async () => {
    await authorizer(approve).authorize();
    const withOrigin: typeof fetch = (input, init) =>
      server.fetchFn(input, {
        ...init,
        headers: {
          ...Object.fromEntries(new Headers(init?.headers)),
          origin: "chrome-extension://x",
        },
      });
    const mcp = new JobSparkMcp(MCP, provider, "0.1.0", withOrigin);

    await expect(mcp.call("get_credit_balance")).rejects.toThrow(
      "MCP_ALLOWED_ORIGINS",
    );
  });
});
