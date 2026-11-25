-- Personal agent tokens for the MCP server (ADR-032) and the log of what
-- each agent did. Only the SHA-256 of a token is stored. Small new tables,
-- plain indexes.
CREATE TABLE IF NOT EXISTS "agent_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_email" text NOT NULL REFERENCES "auth_accounts"("email") ON DELETE CASCADE,
  "name" text NOT NULL,
  "token_hash" text NOT NULL UNIQUE,
  "last_four" text NOT NULL,
  "scopes" jsonb NOT NULL,
  "daily_credit_cap" integer NOT NULL,
  "credits_spent" integer DEFAULT 0 NOT NULL,
  "spent_day" date,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "last_used_at" timestamp with time zone,
  "revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_tokens_user_idx" ON "agent_tokens" ("user_email");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_tool_calls" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "token_id" uuid NOT NULL REFERENCES "agent_tokens"("id") ON DELETE CASCADE,
  "user_email" text NOT NULL,
  "tool" text NOT NULL,
  "outcome" text NOT NULL,
  "credits_spent" integer DEFAULT 0 NOT NULL,
  "duration_ms" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_tool_calls_user_created_idx" ON "agent_tool_calls" ("user_email", "created_at");
