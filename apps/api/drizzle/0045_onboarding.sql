-- The guided first-login onboarding (US-149): when an account finished it, and
-- when it hid the dashboard's "Bien démarrer" checklist. Null means not yet.
ALTER TABLE "auth_accounts" ADD COLUMN IF NOT EXISTS "onboarding_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD COLUMN IF NOT EXISTS "getting_started_dismissed_at" timestamp with time zone;--> statement-breakpoint
-- An account that already has a ready profile — a first name and at least one
-- experience or skill, the rule of `isProfileReady` in apps/web — skips it.
UPDATE "auth_accounts" SET "onboarding_completed_at" = now()
WHERE "onboarding_completed_at" IS NULL
  AND EXISTS (
    SELECT 1 FROM "profiles"
    WHERE "profiles"."user_email" = "auth_accounts"."email"
      AND btrim(coalesce("profiles"."identity"->>'firstName', '')) <> ''
      AND (
        jsonb_array_length(coalesce("profiles"."sections"->'experiences', '[]'::jsonb)) > 0
        OR jsonb_array_length(coalesce("profiles"."sections"->'technicalSkills', '[]'::jsonb)) > 0
        OR jsonb_array_length(coalesce("profiles"."sections"->'softSkills', '[]'::jsonb)) > 0
      )
  );
