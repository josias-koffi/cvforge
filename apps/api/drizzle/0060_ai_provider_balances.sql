-- The prepaid Claude balance as the admin read it on the console, and when. A
-- standard API key cannot read it, so the cockpit counts down from this figure.
CREATE TABLE IF NOT EXISTS "ai_provider_balances" (
  "provider" text PRIMARY KEY NOT NULL,
  "balance_usd" numeric(12, 6) NOT NULL,
  "recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "ai_provider_balances_positive" CHECK ("balance_usd" >= 0)
);
