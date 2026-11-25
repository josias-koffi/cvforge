import type { AgentScope } from "@cvforge/types";
import { and, eq, isNull, lt, notExists, sql } from "drizzle-orm";
import type { Database } from "../../database/database.types";
import { agentTokens, oauthClients, oauthCodes } from "../../database/schema";
import type { AgentTokenRecord } from "../agent-tokens.pg-store";

/** DI token for the OAuth store. */
export const OAUTH_STORE = Symbol("OAUTH_STORE");

export type OAuthClientRecord = typeof oauthClients.$inferSelect;
export type OAuthCodeRecord = typeof oauthCodes.$inferSelect;

export type NewOAuthCode = Omit<OAuthCodeRecord, "usedAt" | "tokenId">;

export type NewOAuthGrant = {
  userEmail: string;
  clientId: string;
  name: string;
  scopes: AgentScope[];
  dailyCreditCap: number;
  resource: string;
  tokenHash: string;
  lastFour: string;
  refreshHash: string;
  accessExpiresAt: Date;
  expiresAt: Date;
};

export type GrantRotation = {
  tokenHash: string;
  lastFour: string;
  refreshHash: string;
  accessExpiresAt: Date;
  expiresAt: Date;
};

export type OAuthStore = {
  findClient: (clientId: string) => Promise<OAuthClientRecord | null>;
  saveClient: (
    client: Omit<OAuthClientRecord, "createdAt" | "lastUsedAt">,
  ) => Promise<void>;
  touchClient: (clientId: string, now: Date) => Promise<void>;
  /** Registered clients nobody connected with, older than `before`. */
  purgeIdleClients: (before: Date) => Promise<number>;

  insertCode: (code: NewOAuthCode) => Promise<void>;
  /**
   * Marks the code used and returns it, in one statement: of two exchanges
   * of the same code, one only gets it. A code already used comes back with
   * `usedAt` set, so the caller can revoke what it was exchanged for.
   */
  consumeCode: (codeHash: string, now: Date) => Promise<OAuthCodeRecord | null>;
  linkCodeToToken: (codeHash: string, tokenId: string) => Promise<void>;

  insertGrant: (grant: NewOAuthGrant) => Promise<AgentTokenRecord>;
  findByRefreshHash: (refreshHash: string) => Promise<AgentTokenRecord | null>;
  findByPreviousRefreshHash: (
    refreshHash: string,
  ) => Promise<AgentTokenRecord | null>;
  /** Swaps both tokens, only if the refresh token is still the current one. */
  rotateGrant: (
    id: string,
    currentRefreshHash: string,
    next: GrantRotation,
  ) => Promise<boolean>;
  revokeGrant: (id: string, now: Date) => Promise<void>;
  /** The grant an access or refresh token belongs to. */
  findByAnyTokenHash: (hash: string) => Promise<AgentTokenRecord | null>;
};

export class PgOAuthStore implements OAuthStore {
  constructor(private readonly db: Database) {}

  async findClient(clientId: string) {
    const [row] = await this.db
      .select()
      .from(oauthClients)
      .where(eq(oauthClients.clientId, clientId))
      .limit(1);

    return row ?? null;
  }

  async saveClient(
    client: Omit<OAuthClientRecord, "createdAt" | "lastUsedAt">,
  ) {
    await this.db
      .insert(oauthClients)
      .values(client)
      .onConflictDoUpdate({
        set: {
          clientName: client.clientName,
          fetchedAt: client.fetchedAt,
          redirectUris: client.redirectUris,
        },
        target: oauthClients.clientId,
      });
  }

  async touchClient(clientId: string, now: Date) {
    await this.db
      .update(oauthClients)
      .set({ lastUsedAt: now })
      .where(eq(oauthClients.clientId, clientId));
  }

  async purgeIdleClients(before: Date) {
    const rows = await this.db
      .delete(oauthClients)
      .where(
        and(
          eq(oauthClients.kind, "dcr"),
          lt(oauthClients.createdAt, before),
          notExists(
            this.db
              .select({ id: agentTokens.id })
              .from(agentTokens)
              .where(eq(agentTokens.oauthClientId, oauthClients.clientId)),
          ),
        ),
      )
      .returning({ clientId: oauthClients.clientId });

    return rows.length;
  }

  async insertCode(code: NewOAuthCode) {
    await this.db.insert(oauthCodes).values(code);
  }

  async consumeCode(codeHash: string, now: Date) {
    const [fresh] = await this.db
      .update(oauthCodes)
      .set({ usedAt: now })
      .where(and(eq(oauthCodes.codeHash, codeHash), isNull(oauthCodes.usedAt)))
      .returning();

    if (fresh) {
      return { ...fresh, usedAt: null };
    }

    const [used] = await this.db
      .select()
      .from(oauthCodes)
      .where(eq(oauthCodes.codeHash, codeHash))
      .limit(1);

    return used ?? null;
  }

  async linkCodeToToken(codeHash: string, tokenId: string) {
    await this.db
      .update(oauthCodes)
      .set({ tokenId })
      .where(eq(oauthCodes.codeHash, codeHash));
  }

  async insertGrant(grant: NewOAuthGrant) {
    const [row] = await this.db
      .insert(agentTokens)
      .values({
        accessExpiresAt: grant.accessExpiresAt,
        dailyCreditCap: grant.dailyCreditCap,
        expiresAt: grant.expiresAt,
        lastFour: grant.lastFour,
        name: grant.name,
        oauthClientId: grant.clientId,
        refreshHash: grant.refreshHash,
        resource: grant.resource,
        scopes: grant.scopes,
        tokenHash: grant.tokenHash,
        userEmail: grant.userEmail,
      })
      .returning();

    return row;
  }

  async findByRefreshHash(refreshHash: string) {
    const [row] = await this.db
      .select()
      .from(agentTokens)
      .where(eq(agentTokens.refreshHash, refreshHash))
      .limit(1);

    return row ?? null;
  }

  async findByPreviousRefreshHash(refreshHash: string) {
    const [row] = await this.db
      .select()
      .from(agentTokens)
      .where(eq(agentTokens.previousRefreshHash, refreshHash))
      .limit(1);

    return row ?? null;
  }

  async rotateGrant(
    id: string,
    currentRefreshHash: string,
    next: GrantRotation,
  ) {
    const rows = await this.db
      .update(agentTokens)
      .set({
        accessExpiresAt: next.accessExpiresAt,
        expiresAt: next.expiresAt,
        lastFour: next.lastFour,
        previousRefreshHash: currentRefreshHash,
        refreshHash: next.refreshHash,
        tokenHash: next.tokenHash,
      })
      .where(
        and(
          eq(agentTokens.id, id),
          eq(agentTokens.refreshHash, currentRefreshHash),
          isNull(agentTokens.revokedAt),
        ),
      )
      .returning({ id: agentTokens.id });

    return rows.length > 0;
  }

  async revokeGrant(id: string, now: Date) {
    await this.db
      .update(agentTokens)
      .set({ revokedAt: now })
      .where(and(eq(agentTokens.id, id), isNull(agentTokens.revokedAt)));
  }

  async findByAnyTokenHash(hash: string) {
    const [row] = await this.db
      .select()
      .from(agentTokens)
      .where(
        sql`${agentTokens.tokenHash} = ${hash} or ${agentTokens.refreshHash} = ${hash}`,
      )
      .limit(1);

    return row ?? null;
  }
}
