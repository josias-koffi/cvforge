import { desc, eq } from "drizzle-orm";
import type { Database } from "../database/database.types";
import {
  agentTokens,
  agentToolCalls,
  formFillSessions,
  formMapVotes,
} from "../database/schema";

/** What the candidate's agents and Chrome extension left on the account. */
export type AgentAccessExport = {
  /** Agent tokens, never their fingerprint (E32). */
  tokens: {
    id: string;
    name: string;
    lastFour: string;
    scopes: string[];
    dailyCreditCap: number;
    createdAt: string;
    expiresAt: string;
    lastUsedAt: string | null;
    revokedAt: string | null;
  }[];
  /** The agents' actions, without their content (kept 90 days). */
  toolCalls: {
    tool: string;
    outcome: string;
    creditsSpent: number;
    durationMs: number;
    createdAt: string;
  }[];
  /** Form fills paid in credits through JobSpark's model (US-202). */
  formFillSessions: {
    applicationId: string;
    calls: number;
    createdAt: string;
    expiresAt: string;
  }[];
  /** What the candidate's fills taught the form map: field shapes, data names (US-205). */
  formMapVotes: {
    site: string;
    signature: string;
    fieldKey: string;
    ok: boolean;
    updatedAt: string;
  }[];
};

const iso = (date: Date | null) => date?.toISOString() ?? null;

export class PgAgentAccessExportStore {
  constructor(private readonly db: Database) {}

  async exportByUserEmail(userEmail: string): Promise<AgentAccessExport> {
    const [tokens, toolCalls, sessions, votes] = await Promise.all([
      this.db
        .select()
        .from(agentTokens)
        .where(eq(agentTokens.userEmail, userEmail))
        .orderBy(desc(agentTokens.createdAt)),
      this.db
        .select()
        .from(agentToolCalls)
        .where(eq(agentToolCalls.userEmail, userEmail))
        .orderBy(desc(agentToolCalls.createdAt)),
      this.db
        .select()
        .from(formFillSessions)
        .where(eq(formFillSessions.userEmail, userEmail))
        .orderBy(desc(formFillSessions.createdAt)),
      this.db
        .select()
        .from(formMapVotes)
        .where(eq(formMapVotes.userEmail, userEmail)),
    ]);
    return {
      formFillSessions: sessions.map((row) => ({
        applicationId: row.applicationId,
        calls: row.calls,
        createdAt: row.createdAt.toISOString(),
        expiresAt: row.expiresAt.toISOString(),
      })),
      formMapVotes: votes.map((row) => ({
        fieldKey: row.fieldKey,
        ok: row.ok,
        signature: row.signature,
        site: row.site,
        updatedAt: row.updatedAt.toISOString(),
      })),
      tokens: tokens.map((row) => ({
        createdAt: row.createdAt.toISOString(),
        dailyCreditCap: row.dailyCreditCap,
        expiresAt: row.expiresAt.toISOString(),
        id: row.id,
        lastFour: row.lastFour,
        lastUsedAt: iso(row.lastUsedAt),
        name: row.name,
        revokedAt: iso(row.revokedAt),
        scopes: row.scopes,
      })),
      toolCalls: toolCalls.map((row) => ({
        createdAt: row.createdAt.toISOString(),
        creditsSpent: row.creditsSpent,
        durationMs: row.durationMs,
        outcome: row.outcome,
        tool: row.tool,
      })),
    };
  }
}
