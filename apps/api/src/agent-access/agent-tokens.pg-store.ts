import type {
  AgentScope,
  AgentToolCall,
  AgentToolCallOutcome,
} from "@cvforge/types";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import type { Database } from "../database/database.types";
import { agentTokens, agentToolCalls } from "../database/schema";

/** DI token for the agent tokens store. */
export const AGENT_TOKENS_STORE = Symbol("AGENT_TOKENS_STORE");

export type AgentTokenRecord = typeof agentTokens.$inferSelect;

export type NewAgentToken = {
  userEmail: string;
  name: string;
  tokenHash: string;
  lastFour: string;
  scopes: AgentScope[];
  dailyCreditCap: number;
  expiresAt: Date;
};

export type NewAgentToolCall = {
  tokenId: string;
  userEmail: string;
  tool: string;
  outcome: AgentToolCallOutcome;
  creditsSpent: number;
  durationMs: number;
};

export type AgentTokensStore = {
  insert: (token: NewAgentToken) => Promise<AgentTokenRecord>;
  /** Personal tokens still usable (OAuth grants are not counted). */
  countActive: (userEmail: string, now: Date) => Promise<number>;
  listByUserEmail: (userEmail: string) => Promise<AgentTokenRecord[]>;
  findByHash: (tokenHash: string) => Promise<AgentTokenRecord | null>;
  /** False when the token is not the user's or was already revoked. */
  revoke: (userEmail: string, id: string, now: Date) => Promise<boolean>;
  touch: (id: string, now: Date) => Promise<void>;
  /**
   * Adds `amount` to the token's spending of `day` in one statement, only if
   * it stays within the cap: two concurrent calls can never both pass.
   */
  reserveCredits: (id: string, amount: number, day: string) => Promise<boolean>;
  refundCredits: (id: string, amount: number, day: string) => Promise<void>;
  recordCall: (call: NewAgentToolCall) => Promise<void>;
  listCalls: (userEmail: string, limit: number) => Promise<AgentToolCall[]>;
  /** Drops the call log older than `before`; returns how many rows went. */
  purgeCallsBefore: (before: Date) => Promise<number>;
};

export class PgAgentTokensStore implements AgentTokensStore {
  constructor(private readonly db: Database) {}

  async insert(token: NewAgentToken) {
    const [row] = await this.db.insert(agentTokens).values(token).returning();

    return row;
  }

  async countActive(userEmail: string, now: Date) {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(agentTokens)
      .where(
        and(
          eq(agentTokens.userEmail, userEmail),
          isNull(agentTokens.revokedAt),
          // OAuth grants come and go with each reconnection: not counted.
          isNull(agentTokens.oauthClientId),
          gt(agentTokens.expiresAt, now),
        ),
      );

    return row?.count ?? 0;
  }

  listByUserEmail(userEmail: string) {
    return this.db
      .select()
      .from(agentTokens)
      .where(eq(agentTokens.userEmail, userEmail))
      .orderBy(desc(agentTokens.createdAt));
  }

  async findByHash(tokenHash: string) {
    const [row] = await this.db
      .select()
      .from(agentTokens)
      .where(eq(agentTokens.tokenHash, tokenHash))
      .limit(1);

    return row ?? null;
  }

  async revoke(userEmail: string, id: string, now: Date) {
    const rows = await this.db
      .update(agentTokens)
      .set({ revokedAt: now })
      .where(
        and(
          eq(agentTokens.id, id),
          eq(agentTokens.userEmail, userEmail),
          isNull(agentTokens.revokedAt),
        ),
      )
      .returning({ id: agentTokens.id });

    return rows.length > 0;
  }

  async touch(id: string, now: Date) {
    await this.db
      .update(agentTokens)
      .set({ lastUsedAt: now })
      .where(eq(agentTokens.id, id));
  }

  async reserveCredits(id: string, amount: number, day: string) {
    const spentSoFar = sql`case when ${agentTokens.spentDay} = ${day} then ${agentTokens.creditsSpent} else 0 end`;
    const rows = await this.db
      .update(agentTokens)
      .set({
        creditsSpent: sql`${spentSoFar} + ${amount}`,
        spentDay: day,
      })
      .where(
        and(
          eq(agentTokens.id, id),
          sql`${spentSoFar} + ${amount} <= ${agentTokens.dailyCreditCap}`,
        ),
      )
      .returning({ id: agentTokens.id });

    return rows.length > 0;
  }

  async refundCredits(id: string, amount: number, day: string) {
    await this.db
      .update(agentTokens)
      .set({
        creditsSpent: sql`greatest(${agentTokens.creditsSpent} - ${amount}, 0)`,
      })
      .where(and(eq(agentTokens.id, id), eq(agentTokens.spentDay, day)));
  }

  async recordCall(call: NewAgentToolCall) {
    await this.db.insert(agentToolCalls).values(call);
  }

  async listCalls(userEmail: string, limit: number) {
    const rows = await this.db
      .select({
        call: agentToolCalls,
        tokenName: agentTokens.name,
      })
      .from(agentToolCalls)
      .innerJoin(agentTokens, eq(agentTokens.id, agentToolCalls.tokenId))
      .where(eq(agentToolCalls.userEmail, userEmail))
      .orderBy(desc(agentToolCalls.createdAt))
      .limit(limit);

    return rows.map(({ call, tokenName }) => ({
      createdAt: call.createdAt.toISOString(),
      creditsSpent: call.creditsSpent,
      durationMs: call.durationMs,
      id: call.id,
      outcome: call.outcome,
      tokenId: call.tokenId,
      tokenName,
      tool: call.tool,
    }));
  }

  async purgeCallsBefore(before: Date) {
    const rows = await this.db
      .delete(agentToolCalls)
      .where(sql`${agentToolCalls.createdAt} < ${before}`)
      .returning({ id: agentToolCalls.id });

    return rows.length;
  }
}
