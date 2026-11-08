import type { AiBillingProvider, AiFeature, AiModelProvider } from "@cvforge/types";
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * One row per AI call (US-154), with what it cost.
 *
 * Before this, the only cost we knew was the account's spend since it was
 * opened: nothing said what a CV costs, which model is expensive, or whether a
 * feature sells for less than it burns. No user is stored on purpose — the
 * cockpit reasons per feature and per model, and a cost log is not somewhere
 * personal data needs to live.
 */
export const aiUsageEvents = pgTable(
  "ai_usage_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    feature: text("feature").$type<AiFeature>().notNull(),
    /** Who billed the call, so each prepaid balance can be followed. */
    provider: text("provider").$type<AiBillingProvider>().notNull().default("openrouter"),
    /** The model that answered, which is not the primary after a fallback. */
    model: text("model").notNull(),
    promptTokens: integer("prompt_tokens").notNull().default(0),
    completionTokens: integer("completion_tokens").notNull().default(0),
    /**
     * In USD. OpenRouter's `usage.cost` as charged; computed from the published
     * rates for a direct provider, which returns tokens only. Zero for a failure.
     */
    costUsd: numeric("cost_usd", { precision: 12, scale: 6, mode: "number" })
      .notNull()
      .default(0),
    durationMs: integer("duration_ms").notNull().default(0),
    status: text("status").$type<"ok" | "error">().notNull(),
    fellBack: boolean("fell_back").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ai_usage_events_created_at_idx").on(table.createdAt),
    index("ai_usage_events_feature_idx").on(table.feature, table.createdAt),
    check("ai_usage_events_status_valid", sql`${table.status} in ('ok', 'error')`),
  ],
);

/**
 * The admin's model for a feature. No row means the deployment's own chain, so
 * an empty table is exactly the behaviour from before this table existed.
 */
export const aiFeatureModels = pgTable("ai_feature_models", {
  feature: text("feature").$type<AiFeature>().primaryKey(),
  provider: text("provider").$type<AiModelProvider>().notNull(),
  model: text("model").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** A prepaid balance as the admin read it, and when: the start of the countdown. */
export const aiProviderBalances = pgTable("ai_provider_balances", {
  provider: text("provider").$type<AiModelProvider>().primaryKey(),
  balanceUsd: numeric("balance_usd", { precision: 12, scale: 6, mode: "number" }).notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
});
