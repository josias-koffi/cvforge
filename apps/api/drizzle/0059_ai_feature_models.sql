-- A call can now be billed by Anthropic as well as OpenRouter, and each prepaid
-- balance has to be followed on its own. Rows before this column are OpenRouter,
-- except the interview voice, which has always gone straight to OpenAI (ADR-026).
ALTER TABLE "ai_usage_events" ADD COLUMN IF NOT EXISTS "provider" text DEFAULT 'openrouter' NOT NULL;
--> statement-breakpoint
UPDATE "ai_usage_events" SET "provider" = 'openai' WHERE "feature" IN ('interview_voice', 'interview_transcription');
--> statement-breakpoint
-- The model the admin picked per feature. No row means the deployment's own
-- chain, so this table starts empty and nothing changes until someone chooses.
CREATE TABLE IF NOT EXISTS "ai_feature_models" (
  "feature" text PRIMARY KEY NOT NULL,
  "provider" text NOT NULL,
  "model" text NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "ai_feature_models_provider_valid" CHECK ("provider" in ('anthropic', 'openrouter'))
);
--> statement-breakpoint
-- Rebuilt from the full `adminAuditActions` list, as in 0049.
ALTER TABLE "admin_audit_log" DROP CONSTRAINT "admin_audit_log_action_valid";
--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_action_valid" CHECK ("action" in ('account_suspended', 'account_reactivated', 'account_deleted', 'role_demoted', 'credits_granted', 'sessions_revoked', 'legal_published', 'ai_model_changed'));
