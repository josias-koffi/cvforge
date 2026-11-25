import type { AgentScope, AgentToolCallOutcome } from "@cvforge/types";
import {
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { authAccounts } from "./auth";

/**
 * Personal agent tokens (ADR-032). Only the SHA-256 of the token is kept;
 * the row goes with the account (cascade).
 */
export const agentTokens = pgTable(
  "agent_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userEmail: text("user_email")
      .notNull()
      .references(() => authAccounts.email, { onDelete: "cascade" }),
    name: text("name").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    lastFour: text("last_four").notNull(),
    scopes: jsonb("scopes").$type<AgentScope[]>().notNull(),
    dailyCreditCap: integer("daily_credit_cap").notNull(),
    /** Credits reserved on `spent_day` (UTC); a new day starts from 0. */
    creditsSpent: integer("credits_spent").notNull().default(0),
    spentDay: date("spent_day", { mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [index("agent_tokens_user_idx").on(table.userEmail)],
);

/** One row per MCP tool call: what ran, never what it carried. */
export const agentToolCalls = pgTable(
  "agent_tool_calls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenId: uuid("token_id")
      .notNull()
      .references(() => agentTokens.id, { onDelete: "cascade" }),
    userEmail: text("user_email").notNull(),
    tool: text("tool").notNull(),
    outcome: text("outcome").$type<AgentToolCallOutcome>().notNull(),
    creditsSpent: integer("credits_spent").notNull().default(0),
    durationMs: integer("duration_ms").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("agent_tool_calls_user_created_idx").on(
      table.userEmail,
      table.createdAt,
    ),
  ],
);
