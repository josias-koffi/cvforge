-- OAuth for MCP clients (ADR-033): the clients that asked (registered or
-- known by their metadata document), the one-time authorization codes, and
-- on agent tokens the OAuth grant they belong to. Small tables, plain indexes.
CREATE TABLE IF NOT EXISTS "oauth_clients" (
  "client_id" text PRIMARY KEY NOT NULL,
  "kind" text NOT NULL,
  "client_name" text NOT NULL,
  "redirect_uris" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "fetched_at" timestamp with time zone,
  "last_used_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "oauth_codes" (
  "code_hash" text PRIMARY KEY NOT NULL,
  "client_id" text NOT NULL,
  "user_email" text NOT NULL REFERENCES "auth_accounts"("email") ON DELETE CASCADE,
  "redirect_uri" text NOT NULL,
  "code_challenge" text NOT NULL,
  "resource" text NOT NULL,
  "scopes" jsonb NOT NULL,
  "daily_credit_cap" integer NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "used_at" timestamp with time zone,
  "token_id" uuid
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "oauth_codes_user_idx" ON "oauth_codes" ("user_email");
--> statement-breakpoint
ALTER TABLE "agent_tokens" ADD COLUMN IF NOT EXISTS "oauth_client_id" text;
--> statement-breakpoint
ALTER TABLE "agent_tokens" ADD COLUMN IF NOT EXISTS "resource" text;
--> statement-breakpoint
ALTER TABLE "agent_tokens" ADD COLUMN IF NOT EXISTS "access_expires_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "agent_tokens" ADD COLUMN IF NOT EXISTS "refresh_hash" text UNIQUE;
--> statement-breakpoint
ALTER TABLE "agent_tokens" ADD COLUMN IF NOT EXISTS "previous_refresh_hash" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_tokens_previous_refresh_idx" ON "agent_tokens" ("previous_refresh_hash");
