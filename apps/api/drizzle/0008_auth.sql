CREATE TABLE "auth_accounts" (
	"email" text PRIMARY KEY NOT NULL,
	"role" text NOT NULL,
	"consent" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_accounts_role_valid" CHECK ("auth_accounts"."role" in ('admin', 'user'))
);
--> statement-breakpoint
CREATE TABLE "auth_invitations" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	CONSTRAINT "auth_invitations_role_valid" CHECK ("auth_invitations"."role" in ('admin', 'user'))
);
--> statement-breakpoint
CREATE TABLE "auth_settings" (
	"id" text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	"bootstrap_consumed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX "auth_invitations_email_idx" ON "auth_invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "auth_invitations_created_by_idx" ON "auth_invitations" USING btree ("created_by");