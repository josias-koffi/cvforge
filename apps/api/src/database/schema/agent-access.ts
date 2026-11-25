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
    /** Set when the token came from an OAuth grant (ADR-033). */
    oauthClientId: text("oauth_client_id"),
    /** The MCP URL an OAuth token was issued for (RFC 8707). */
    resource: text("resource"),
    /** OAuth access tokens live 1 h; `expires_at` is then the grant's end. */
    accessExpiresAt: timestamp("access_expires_at", { withTimezone: true }),
    refreshHash: text("refresh_hash").unique(),
    /** The refresh token just rotated out: seeing it again revokes the grant. */
    previousRefreshHash: text("previous_refresh_hash"),
  },
  (table) => [
    index("agent_tokens_user_idx").on(table.userEmail),
    index("agent_tokens_previous_refresh_idx").on(table.previousRefreshHash),
  ],
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

/** OAuth clients: registered (DCR) or known by their metadata URL (CIMD). */
export const oauthClients = pgTable("oauth_clients", {
  clientId: text("client_id").primaryKey(),
  kind: text("kind").$type<"dcr" | "cimd">().notNull(),
  clientName: text("client_name").notNull(),
  redirectUris: jsonb("redirect_uris").$type<string[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
});

/** One-time authorization codes, 10 minutes, stored hashed. */
export const oauthCodes = pgTable(
  "oauth_codes",
  {
    codeHash: text("code_hash").primaryKey(),
    clientId: text("client_id").notNull(),
    userEmail: text("user_email")
      .notNull()
      .references(() => authAccounts.email, { onDelete: "cascade" }),
    redirectUri: text("redirect_uri").notNull(),
    codeChallenge: text("code_challenge").notNull(),
    resource: text("resource").notNull(),
    scopes: jsonb("scopes").$type<AgentScope[]>().notNull(),
    dailyCreditCap: integer("daily_credit_cap").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    /** The token the code was exchanged for: revoked if the code comes back. */
    tokenId: uuid("token_id"),
  },
  (table) => [index("oauth_codes_user_idx").on(table.userEmail)],
);
