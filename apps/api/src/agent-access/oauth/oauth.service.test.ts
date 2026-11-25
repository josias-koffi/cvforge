import { createHash } from "node:crypto";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { authAccounts } from "../../database/schema";
import {
  createTestDatabase,
  type TestDatabase,
} from "../../database/testing/test-database";
import { PgAgentTokensStore } from "../agent-tokens.pg-store";
import { AgentTokensService } from "../agent-tokens.service";
import { OAuthClients } from "./oauth-clients";
import type { OAuthConfig } from "./oauth.config";
import { PgOAuthStore } from "./oauth.pg-store";
import { OAuthService } from "./oauth.service";

const EMAIL = "user@example.com";
const CONFIG: OAuthConfig = {
  appUrl: "https://app.example",
  issuer: "https://api.example",
  mcpUrl: "https://api.example/mcp",
  sessionSecret: "secret",
};
const REDIRECT = "https://claude.ai/api/mcp/auth_callback";
const VERIFIER = "v".repeat(64);
const CHALLENGE = createHash("sha256").update(VERIFIER).digest("base64url");
const CIMD = "https://claude.ai/oauth/claude-code-client-metadata";

let db: TestDatabase;
let now: Date;
let fetchDocument: ReturnType<typeof vi.fn>;
let oauth: OAuthService;
let clients: OAuthClients;
let tokens: AgentTokensService;

function query(clientId: string, extra: Record<string, string> = {}) {
  return {
    client_id: clientId,
    code_challenge: CHALLENGE,
    code_challenge_method: "S256",
    redirect_uri: REDIRECT,
    resource: CONFIG.mcpUrl,
    response_type: "code",
    scope: "jobs:read credits:read offline_access",
    state: "xyz",
    ...extra,
  };
}

/** authorize → consent → code, as claude.ai and the user would. */
async function codeFor(clientId: string, approve = true) {
  const outcome = await oauth.authorize(query(clientId));
  if (outcome.kind !== "consent") throw new Error(JSON.stringify(outcome));
  const request = new URL(outcome.url).searchParams.get("request")!;
  const redirect = new URL(
    await oauth.decide(EMAIL, { approve, dailyCreditCap: 7, request }),
  );
  return redirect;
}

async function exchange(clientId: string, code: string, extra = {}) {
  return oauth.token({
    client_id: clientId,
    code,
    code_verifier: VERIFIER,
    grant_type: "authorization_code",
    redirect_uri: REDIRECT,
    resource: CONFIG.mcpUrl,
    ...extra,
  });
}

describe("OAuthService", () => {
  beforeAll(async () => {
    db = await createTestDatabase();
  });

  afterAll(async () => {
    await db.close();
  });

  beforeEach(async () => {
    await db.reset();
    await db.db.insert(authAccounts).values({ email: EMAIL, role: "user" });
    now = new Date("2026-11-25T10:00:00.000Z");
    const store = new PgOAuthStore(db.db);
    fetchDocument = vi.fn(async () => ({
      status: 200,
      text: JSON.stringify({
        client_id: CIMD,
        client_name: "Claude Code",
        redirect_uris: ["http://127.0.0.1/callback", REDIRECT],
      }),
    }));
    clients = new OAuthClients(store, fetchDocument, () => now);
    oauth = new OAuthService(CONFIG, clients, store, () => now);
    tokens = new AgentTokensService(
      new PgAgentTokensStore(db.db),
      {
        readAccountState: async () => ({
          sessionsValidFrom: null,
          status: "active",
        }),
      } as never,
      () => now,
    );
  });

  it("runs the whole flow for a registered client, and the token opens /mcp", async () => {
    const client = await clients.register({
      client_name: "Claude",
      redirect_uris: [REDIRECT],
    });
    const redirect = await codeFor(client.clientId);

    expect(redirect.origin + redirect.pathname).toBe(REDIRECT);
    expect(redirect.searchParams.get("state")).toBe("xyz");
    expect(redirect.searchParams.get("iss")).toBe(CONFIG.issuer);

    const { body, status } = await exchange(
      client.clientId,
      redirect.searchParams.get("code")!,
    );
    expect(status).toBe(200);
    expect(body).toMatchObject({ expires_in: 3600, token_type: "Bearer" });
    expect(String(body.scope).split(" ").sort()).toEqual([
      "credits:read",
      "jobs:read",
      "offline_access",
    ]);

    const principal = await tokens.authenticate(String(body.access_token));
    expect(principal?.userEmail).toBe(EMAIL);
    expect([...principal!.scopes].sort()).toEqual([
      "credits:read",
      "jobs:read",
    ]);

    const [summary] = await tokens.list(EMAIL);
    expect(summary).toMatchObject({
      dailyCreditCap: 7,
      name: "Claude",
      source: "oauth",
    });
  });

  it("expires the access token after an hour", async () => {
    const client = await clients.register({ redirect_uris: [REDIRECT] });
    const code = (await codeFor(client.clientId)).searchParams.get("code")!;
    const { body } = await exchange(client.clientId, code);

    now = new Date(now.getTime() + 3601 * 1000);
    expect(await tokens.authenticate(String(body.access_token))).toBeNull();
  });

  it("refuses a wrong verifier, redirect, resource or client, and an expired code", async () => {
    const client = await clients.register({ redirect_uris: [REDIRECT] });
    const other = await clients.register({ redirect_uris: [REDIRECT] });

    for (const extra of [
      { code_verifier: "w".repeat(64) },
      { redirect_uri: "https://claude.ai/other" },
      { resource: "https://evil.example/mcp" },
    ]) {
      const code = (await codeFor(client.clientId)).searchParams.get("code")!;
      expect((await exchange(client.clientId, code, extra)).body.error).toBe(
        "invalid_grant",
      );
    }

    const code = (await codeFor(client.clientId)).searchParams.get("code")!;
    expect((await exchange(other.clientId, code)).body.error).toBe(
      "invalid_grant",
    );

    const late = (await codeFor(client.clientId)).searchParams.get("code")!;
    now = new Date(now.getTime() + 11 * 60 * 1000);
    expect((await exchange(client.clientId, late)).body.error).toBe(
      "invalid_grant",
    );
  });

  it("takes back the token when a code is used twice", async () => {
    const client = await clients.register({ redirect_uris: [REDIRECT] });
    const code = (await codeFor(client.clientId)).searchParams.get("code")!;
    const first = await exchange(client.clientId, code);

    expect((await exchange(client.clientId, code)).body.error).toBe(
      "invalid_grant",
    );
    expect(
      await tokens.authenticate(String(first.body.access_token)),
    ).toBeNull();
  });

  it("rotates refresh tokens and revokes the grant when an old one comes back", async () => {
    const client = await clients.register({ redirect_uris: [REDIRECT] });
    const code = (await codeFor(client.clientId)).searchParams.get("code")!;
    const first = (await exchange(client.clientId, code)).body;
    const refresh = (token: unknown) =>
      oauth.token({
        client_id: client.clientId,
        grant_type: "refresh_token",
        refresh_token: token,
      });

    const second = await refresh(first.refresh_token);
    expect(second.status).toBe(200);
    expect(second.body.refresh_token).not.toBe(first.refresh_token);
    expect(await tokens.authenticate(String(first.access_token))).toBeNull();
    expect(
      await tokens.authenticate(String(second.body.access_token)),
    ).not.toBeNull();

    // The first refresh token again: someone else has a copy.
    expect((await refresh(first.refresh_token)).body.error).toBe(
      "invalid_grant",
    );
    expect(
      await tokens.authenticate(String(second.body.access_token)),
    ).toBeNull();
    expect((await refresh(second.body.refresh_token)).body.error).toBe(
      "invalid_grant",
    );
  });

  it("sends a refusal back as access_denied, with state and iss", async () => {
    const client = await clients.register({ redirect_uris: [REDIRECT] });
    const redirect = await codeFor(client.clientId, false);

    expect(redirect.searchParams.get("error")).toBe("access_denied");
    expect(redirect.searchParams.get("state")).toBe("xyz");
    expect(redirect.searchParams.get("iss")).toBe(CONFIG.issuer);
    expect(redirect.searchParams.get("code")).toBeNull();
  });

  it("never redirects to an unknown client or an undeclared redirect URI", async () => {
    const client = await clients.register({ redirect_uris: [REDIRECT] });

    expect((await oauth.authorize(query("nope"))).kind).toBe("error-page");
    expect(
      (
        await oauth.authorize(
          query(client.clientId, { redirect_uri: "https://evil.example/cb" }),
        )
      ).kind,
    ).toBe("error-page");
  });

  it("redirects protocol errors back with state and iss", async () => {
    const client = await clients.register({ redirect_uris: [REDIRECT] });

    for (const [extra, error] of [
      [{ code_challenge_method: "plain" }, "invalid_request"],
      [{ response_type: "token" }, "unsupported_response_type"],
      [{ resource: "https://evil.example/mcp" }, "invalid_target"],
    ] as const) {
      const outcome = await oauth.authorize(query(client.clientId, extra));
      expect(outcome.kind).toBe("client-redirect");
      const url = new URL((outcome as { url: string }).url);
      expect(url.searchParams.get("error")).toBe(error);
      expect(url.searchParams.get("iss")).toBe(CONFIG.issuer);
    }
  });

  it("knows a CIMD client by its document, loopback on any port, cached a day", async () => {
    const outcome = await oauth.authorize(
      query(CIMD, { redirect_uri: "http://127.0.0.1:61234/callback" }),
    );
    expect(outcome.kind).toBe("consent");

    const request = new URL((outcome as { url: string }).url).searchParams.get(
      "request",
    )!;
    expect(await oauth.describe(request)).toMatchObject({
      clientKind: "cimd",
      clientName: "Claude Code",
      redirectHost: "127.0.0.1:61234",
      requestedScopes: ["jobs:read", "credits:read"],
    });

    await clients.resolve(CIMD);
    expect(fetchDocument).toHaveBeenCalledTimes(1);
  });

  it("refuses a CIMD document whose client_id is not its own address", async () => {
    fetchDocument.mockResolvedValueOnce({
      status: 200,
      text: JSON.stringify({
        client_id: "https://evil.example/doc",
        redirect_uris: [REDIRECT],
      }),
    });

    expect((await oauth.authorize(query(CIMD))).kind).toBe("error-page");
  });

  it("refuses a forged or stale consent request", async () => {
    const client = await clients.register({ redirect_uris: [REDIRECT] });
    const outcome = await oauth.authorize(query(client.clientId));
    const request = new URL((outcome as { url: string }).url).searchParams.get(
      "request",
    )!;

    expect(await oauth.describe(`${request}x`)).toBeNull();
    now = new Date(now.getTime() + 11 * 60 * 1000);
    expect(await oauth.describe(request)).toBeNull();
    await expect(
      oauth.decide(EMAIL, { approve: true, request }),
    ).rejects.toThrow(/expirée/);
  });

  it("refuses DCR with a non-https redirect", async () => {
    await expect(
      clients.register({ redirect_uris: ["http://evil.example/cb"] }),
    ).rejects.toThrow();
  });
});
