CREATE TABLE "auth_magic_links" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"consent" jsonb,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "auth_magic_links_email_idx" ON "auth_magic_links" USING btree ("email");--> statement-breakpoint
CREATE INDEX "auth_magic_links_expires_at_idx" ON "auth_magic_links" USING btree ("expires_at");
