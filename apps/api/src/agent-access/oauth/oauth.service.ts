import { randomBytes } from "node:crypto";
import {
  AGENT_TOKEN_DEFAULT_DAILY_CREDIT_CAP,
  AGENT_TOKEN_MAX_DAILY_CREDIT_CAP,
  AGENT_TOKEN_PREFIX,
  isAgentScope,
  type AgentScope,
  type OAuthConsentDecision,
  type OAuthConsentRequest,
} from "@cvforge/types";
import { hashAgentToken } from "../agent-tokens.service";
import { SignedPayload } from "../signed-payload";
import type { OAuthClient, OAuthClients } from "./oauth-clients";
import {
  OAUTH_ACCESS_TOKEN_TTL_S,
  OAUTH_CODE_TTL_MS,
  OAUTH_GRANT_TTL_DAYS,
  OAUTH_REQUEST_TTL_MS,
  type OAuthConfig,
} from "./oauth.config";
import {
  isCodeChallenge,
  readScopes,
  redirectUriMatches,
  redirectWith,
  resourceMatches,
  verifierMatches,
} from "./oauth-rules";
import type { OAuthStore } from "./oauth.pg-store";

const DAY_MS = 24 * 60 * 60 * 1000;
const REFRESH_PREFIX = "jsr_";
const CODE_PREFIX = "jsc_";

/** A pending authorization, signed into the consent page's URL. */
type PendingRequest = {
  c: string;
  r: string;
  s?: string;
  ch: string;
  sc: AgentScope[];
  x: number;
};

export type AuthorizeQuery = Record<string, unknown>;

/** Where `/oauth/authorize` sends the browser, or why it cannot. */
export type AuthorizeOutcome =
  | { kind: "consent"; url: string }
  | { kind: "client-redirect"; url: string }
  /** Bad client or redirect URI: shown to the user, never redirected (RFC 6749 §4.1.2.1). */
  | { kind: "error-page"; message: string };

export type TokenResponse = {
  status: number;
  body: Record<string, unknown>;
};

export class OAuthError extends Error {
  constructor(
    readonly error: string,
    description: string,
    readonly status = 400,
  ) {
    super(description);
  }
}

function secret(prefix: string) {
  return `${prefix}${randomBytes(32).toString("base64url")}`;
}

function readString(value: unknown) {
  return typeof value === "string" && value ? value : undefined;
}

export class OAuthService {
  private readonly requests: SignedPayload;

  constructor(
    private readonly config: OAuthConfig,
    private readonly clients: Pick<OAuthClients, "resolve">,
    private readonly store: OAuthStore,
    private readonly now: () => Date = () => new Date(),
  ) {
    this.requests = new SignedPayload(
      config.sessionSecret,
      "oauth-authorization-request",
    );
  }

  async authorize(query: AuthorizeQuery): Promise<AuthorizeOutcome> {
    const client = await this.clients.resolve(query.client_id);
    const redirectUri = readString(query.redirect_uri);

    if (!client) {
      return {
        kind: "error-page",
        message: "Application inconnue (client_id).",
      };
    }

    if (
      !redirectUri ||
      !client.redirectUris.some((uri) => redirectUriMatches(uri, redirectUri))
    ) {
      return {
        kind: "error-page",
        message:
          "Adresse de retour non déclarée par cette application (redirect_uri).",
      };
    }

    const state = readString(query.state);
    const fail = (error: string, description: string): AuthorizeOutcome => ({
      kind: "client-redirect",
      url: redirectWith(redirectUri, {
        error,
        error_description: description,
        iss: this.config.issuer,
        state,
      }),
    });

    if (query.response_type !== "code") {
      return fail(
        "unsupported_response_type",
        "Only response_type=code is supported.",
      );
    }

    if (
      query.code_challenge_method !== "S256" ||
      !isCodeChallenge(query.code_challenge)
    ) {
      return fail(
        "invalid_request",
        "PKCE with code_challenge_method=S256 is required.",
      );
    }

    if (!resourceMatches(query.resource, this.config.mcpUrl)) {
      return fail("invalid_target", `resource must be ${this.config.mcpUrl}.`);
    }

    const pending: PendingRequest = {
      c: client.clientId,
      ch: query.code_challenge,
      r: redirectUri,
      s: state,
      sc: readScopes(query.scope),
      x: this.now().getTime() + OAUTH_REQUEST_TTL_MS,
    };
    const consent = new URL(`${this.config.appUrl}/autoriser-agent`);
    consent.searchParams.set("request", this.requests.sign(pending));

    return { kind: "consent", url: consent.toString() };
  }

  /** What the consent page shows; null when the request is forged or stale. */
  async describe(request: string): Promise<OAuthConsentRequest | null> {
    const pending = this.readPending(request);
    const client = pending && (await this.clients.resolve(pending.c));

    if (!pending || !client) {
      return null;
    }

    return {
      clientKind: client.kind,
      clientName: client.clientName,
      redirectHost: new URL(pending.r).host,
      requestedScopes: pending.sc,
    };
  }

  /** The user's answer; returns where the browser goes next (the client). */
  async decide(userEmail: string, decision: OAuthConsentDecision) {
    const pending = this.readPending(decision.request);
    const client = pending && (await this.clients.resolve(pending.c));

    if (!pending || !client) {
      throw new OAuthError(
        "invalid_request",
        "Demande expirée : relancez la connexion depuis l'agent.",
      );
    }

    if (!decision.approve) {
      return redirectWith(pending.r, {
        error: "access_denied",
        error_description: "The user refused.",
        iss: this.config.issuer,
        state: pending.s,
      });
    }

    const code = secret(CODE_PREFIX);
    await this.store.insertCode({
      clientId: client.clientId,
      codeChallenge: pending.ch,
      codeHash: hashAgentToken(code),
      dailyCreditCap: this.readCap(decision.dailyCreditCap),
      expiresAt: new Date(this.now().getTime() + OAUTH_CODE_TTL_MS),
      redirectUri: pending.r,
      resource: this.config.mcpUrl,
      scopes: this.readGrantedScopes(decision.scopes, pending.sc),
      userEmail,
    });

    return redirectWith(pending.r, {
      code,
      iss: this.config.issuer,
      state: pending.s,
    });
  }

  /** `POST /oauth/token`, form-encoded (RFC 6749 §4.1.3, §6). */
  async token(form: Record<string, unknown>): Promise<TokenResponse> {
    try {
      const client = await this.clients.resolve(form.client_id);

      if (!client) {
        throw new OAuthError("invalid_client", "Unknown client_id.", 401);
      }

      if (form.grant_type === "authorization_code") {
        return { body: await this.exchangeCode(client, form), status: 200 };
      }

      if (form.grant_type === "refresh_token") {
        return { body: await this.refresh(client, form), status: 200 };
      }

      throw new OAuthError(
        "unsupported_grant_type",
        "Use authorization_code or refresh_token.",
      );
    } catch (error) {
      if (error instanceof OAuthError) {
        return {
          body: { error: error.error, error_description: error.message },
          status: error.status,
        };
      }

      throw error;
    }
  }

  /** `POST /oauth/revoke` (RFC 7009): always 200, even for an unknown token. */
  async revoke(token: unknown) {
    if (typeof token !== "string" || !token) return;

    const grant = await this.store.findByAnyTokenHash(hashAgentToken(token));

    if (grant?.oauthClientId) {
      await this.store.revokeGrant(grant.id, this.now());
    }
  }

  private async exchangeCode(
    client: OAuthClient,
    form: Record<string, unknown>,
  ) {
    const code = readString(form.code);
    const now = this.now();
    const record =
      code && (await this.store.consumeCode(hashAgentToken(code), now));

    if (!code || !record || record.clientId !== client.clientId) {
      throw new OAuthError("invalid_grant", "Unknown authorization code.");
    }

    // A code used twice may have leaked: what it gave is taken back (RFC 6749 §4.1.2).
    if (record.usedAt) {
      if (record.tokenId) await this.store.revokeGrant(record.tokenId, now);
      throw new OAuthError("invalid_grant", "Authorization code already used.");
    }

    if (
      record.expiresAt <= now ||
      !redirectUriMatches(
        record.redirectUri,
        readString(form.redirect_uri) ?? "",
      ) ||
      !resourceMatches(form.resource, record.resource) ||
      !verifierMatches(form.code_verifier, record.codeChallenge)
    ) {
      throw new OAuthError(
        "invalid_grant",
        "Code expired, or redirect_uri, resource or code_verifier mismatch.",
      );
    }

    const access = secret(AGENT_TOKEN_PREFIX);
    const refresh = secret(REFRESH_PREFIX);
    const grant = await this.store.insertGrant({
      accessExpiresAt: new Date(
        now.getTime() + OAUTH_ACCESS_TOKEN_TTL_S * 1000,
      ),
      clientId: client.clientId,
      dailyCreditCap: record.dailyCreditCap,
      expiresAt: new Date(now.getTime() + OAUTH_GRANT_TTL_DAYS * DAY_MS),
      lastFour: access.slice(-4),
      name: client.clientName,
      refreshHash: hashAgentToken(refresh),
      resource: record.resource,
      scopes: record.scopes,
      tokenHash: hashAgentToken(access),
      userEmail: record.userEmail,
    });
    await this.store.linkCodeToToken(record.codeHash, grant.id);
    await this.store.touchClient(client.clientId, now);

    return this.tokenBody(access, refresh, record.scopes);
  }

  private async refresh(client: OAuthClient, form: Record<string, unknown>) {
    const presented = readString(form.refresh_token);
    const hash = presented ? hashAgentToken(presented) : "";
    const now = this.now();
    const grant = hash ? await this.store.findByRefreshHash(hash) : null;

    if (!grant) {
      // An old refresh token coming back means a copy is in other hands.
      const replayed = hash
        ? await this.store.findByPreviousRefreshHash(hash)
        : null;
      if (replayed) await this.store.revokeGrant(replayed.id, now);
      throw new OAuthError(
        "invalid_grant",
        "Unknown or already used refresh token.",
      );
    }

    if (
      grant.oauthClientId !== client.clientId ||
      grant.revokedAt ||
      grant.expiresAt <= now ||
      !resourceMatches(form.resource, grant.resource ?? this.config.mcpUrl)
    ) {
      throw new OAuthError(
        "invalid_grant",
        "Refresh token revoked, expired or not yours.",
      );
    }

    const access = secret(AGENT_TOKEN_PREFIX);
    const refresh = secret(REFRESH_PREFIX);
    const rotated = await this.store.rotateGrant(grant.id, hash, {
      accessExpiresAt: new Date(
        now.getTime() + OAUTH_ACCESS_TOKEN_TTL_S * 1000,
      ),
      expiresAt: new Date(now.getTime() + OAUTH_GRANT_TTL_DAYS * DAY_MS),
      lastFour: access.slice(-4),
      refreshHash: hashAgentToken(refresh),
      tokenHash: hashAgentToken(access),
    });

    if (!rotated) {
      throw new OAuthError("invalid_grant", "Refresh token already used.");
    }

    return this.tokenBody(access, refresh, grant.scopes);
  }

  private tokenBody(access: string, refresh: string, scopes: AgentScope[]) {
    return {
      access_token: access,
      expires_in: OAUTH_ACCESS_TOKEN_TTL_S,
      refresh_token: refresh,
      scope: [...scopes, "offline_access"].join(" "),
      token_type: "Bearer",
    };
  }

  private readPending(request: unknown) {
    const pending =
      typeof request === "string"
        ? this.requests.read<PendingRequest>(request)
        : null;

    return pending && pending.x > this.now().getTime() ? pending : null;
  }

  private readCap(value: unknown) {
    return Number.isInteger(value) &&
      (value as number) >= 0 &&
      (value as number) <= AGENT_TOKEN_MAX_DAILY_CREDIT_CAP
      ? (value as number)
      : AGENT_TOKEN_DEFAULT_DAILY_CREDIT_CAP;
  }

  /** What the user ticked; else what the agent asked; never nothing. */
  /** What the user ticked, never more than the client asked for. */
  private readGrantedScopes(chosen: unknown, requested: AgentScope[]) {
    const ticked = Array.isArray(chosen)
      ? [...new Set(chosen.filter(isAgentScope))]
      : [];
    const scopes =
      requested.length > 0
        ? ticked.filter((scope) => requested.includes(scope))
        : ticked;

    if (scopes.length > 0) return scopes;
    if (requested.length > 0) return requested;

    throw new OAuthError(
      "invalid_scope",
      "Choisissez au moins une permission.",
    );
  }
}
