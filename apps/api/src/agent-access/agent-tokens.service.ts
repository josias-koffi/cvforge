import { createHash, randomBytes } from "node:crypto";
import {
  ACCOUNT_STATUS_SUSPENDED,
  AGENT_TOKEN_MAX_ACTIVE,
  AGENT_TOKEN_PREFIX,
  type AgentScope,
  type AgentTokenCreateRequest,
  type AgentTokenCreateResponse,
  type AgentTokenSummary,
} from "@cvforge/types";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { AuthService } from "../auth/auth.service";
import type {
  AgentTokenRecord,
  AgentTokensStore,
  NewAgentToolCall,
} from "./agent-tokens.pg-store";

const DAY_MS = 24 * 60 * 60 * 1000;
/** `last_used_at` is informative: one write a minute per token is enough. */
const TOUCH_INTERVAL_MS = 60 * 1000;
const RAW_TOKEN_PATTERN = /^jsk_[A-Za-z0-9_-]{43}$/;
export const ACTIVITY_LIMIT = 50;

/** Who an agent acts for, once its token is verified. Always a plain user. */
export type AgentPrincipal = {
  tokenId: string;
  userEmail: string;
  scopes: ReadonlySet<AgentScope>;
};

export function hashAgentToken(rawToken: string) {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function utcDay(now: Date) {
  return now.toISOString().slice(0, 10);
}

export function toAgentTokenSummary(
  record: AgentTokenRecord,
  now: Date,
): AgentTokenSummary {
  return {
    createdAt: record.createdAt.toISOString(),
    creditsSpentToday:
      record.spentDay === utcDay(now) ? record.creditsSpent : 0,
    dailyCreditCap: record.dailyCreditCap,
    expiresAt: record.expiresAt.toISOString(),
    id: record.id,
    lastFour: record.lastFour,
    lastUsedAt: record.lastUsedAt?.toISOString() ?? null,
    name: record.name,
    revokedAt: record.revokedAt?.toISOString() ?? null,
    scopes: record.scopes,
    source: record.oauthClientId ? "oauth" : "personal",
    status: record.revokedAt
      ? "revoked"
      : record.expiresAt <= now
        ? "expired"
        : "active",
  };
}

export class AgentTokensService {
  constructor(
    private readonly store: AgentTokensStore,
    private readonly authService: Pick<AuthService, "readAccountState">,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async create(
    userEmail: string,
    request: AgentTokenCreateRequest,
  ): Promise<AgentTokenCreateResponse> {
    const now = this.now();

    if (
      (await this.store.countActive(userEmail, now)) >= AGENT_TOKEN_MAX_ACTIVE
    ) {
      throw new BadRequestException(
        `${AGENT_TOKEN_MAX_ACTIVE} jetons actifs au plus : révoquez-en un d'abord.`,
      );
    }

    const token = `${AGENT_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
    const record = await this.store.insert({
      dailyCreditCap: request.dailyCreditCap,
      expiresAt: new Date(now.getTime() + request.ttlDays * DAY_MS),
      lastFour: token.slice(-4),
      name: request.name,
      scopes: request.scopes,
      tokenHash: hashAgentToken(token),
      userEmail,
    });

    return { summary: toAgentTokenSummary(record, now), token };
  }

  async list(userEmail: string) {
    const now = this.now();
    const records = await this.store.listByUserEmail(userEmail);

    return records.map((record) => toAgentTokenSummary(record, now));
  }

  async revoke(userEmail: string, id: string) {
    if (!(await this.store.revoke(userEmail, id, this.now()))) {
      throw new NotFoundException("Jeton introuvable ou déjà révoqué.");
    }
  }

  listActivity(userEmail: string) {
    return this.store.listCalls(userEmail, ACTIVITY_LIMIT);
  }

  /**
   * Resolves a bearer token, or null. Refused: unknown, revoked, expired,
   * account gone or suspended, or issued before "log out everywhere".
   */
  async authenticate(
    rawToken: string | undefined,
  ): Promise<AgentPrincipal | null> {
    if (!rawToken || !RAW_TOKEN_PATTERN.test(rawToken)) {
      return null;
    }

    const record = await this.store.findByHash(hashAgentToken(rawToken));
    const now = this.now();

    if (
      !record ||
      record.revokedAt ||
      record.expiresAt <= now ||
      (record.accessExpiresAt && record.accessExpiresAt <= now)
    ) {
      return null;
    }

    const state = await this.authService.readAccountState(record.userEmail);

    if (
      !state ||
      state.status === ACCOUNT_STATUS_SUSPENDED ||
      (state.sessionsValidFrom &&
        record.createdAt.getTime() <
          new Date(state.sessionsValidFrom).getTime())
    ) {
      return null;
    }

    if (
      !record.lastUsedAt ||
      now.getTime() - record.lastUsedAt.getTime() > TOUCH_INTERVAL_MS
    ) {
      await this.store.touch(record.id, now);
    }

    return {
      scopes: new Set(record.scopes),
      tokenId: record.id,
      userEmail: record.userEmail,
    };
  }

  /**
   * Reserves `amount` credits on today's cap. Returns the day reserved on (to
   * refund the same day even past midnight), or null when over the cap.
   */
  async reserveCredits(tokenId: string, amount: number) {
    const day = utcDay(this.now());

    return (await this.store.reserveCredits(tokenId, amount, day)) ? day : null;
  }

  refundCredits(tokenId: string, amount: number, day: string) {
    return this.store.refundCredits(tokenId, amount, day);
  }

  recordCall(call: NewAgentToolCall) {
    return this.store.recordCall(call);
  }
}
