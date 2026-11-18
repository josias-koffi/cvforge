-- Browsers that accepted push notifications: job alerts reach the candidate
-- there instead of by e-mail. Small table, plain index.
CREATE TABLE IF NOT EXISTS "push_subscriptions" (
  "endpoint" text PRIMARY KEY NOT NULL,
  "user_email" text NOT NULL,
  "p256dh" text NOT NULL,
  "auth" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "push_subscriptions_user_idx" ON "push_subscriptions" ("user_email");
