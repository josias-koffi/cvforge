CREATE TABLE "credit_balances" (
	"user_email" text PRIMARY KEY NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seq" bigserial NOT NULL,
	"user_email" text NOT NULL,
	"type" text NOT NULL,
	"action" text NOT NULL,
	"amount" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"note" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"idempotency_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_ledger_entries_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE INDEX "credit_ledger_entries_user_seq_idx" ON "credit_ledger_entries" USING btree ("user_email","seq");