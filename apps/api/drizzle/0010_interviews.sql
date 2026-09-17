CREATE TABLE "interview_chunks" (
	"session_id" text NOT NULL,
	"chunk_id" text NOT NULL,
	"sequence" integer NOT NULL,
	"status" text NOT NULL,
	"transcript" text DEFAULT '' NOT NULL,
	"mime_type" text DEFAULT 'audio/webm' NOT NULL,
	"is_final" boolean DEFAULT false NOT NULL,
	"error_message" text,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interview_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_email" text NOT NULL,
	"application_id" text,
	"status" text NOT NULL,
	"ai_status" text NOT NULL,
	"ai_response" text,
	"ai_response_generated_at" timestamp with time zone,
	"language" text DEFAULT 'fr' NOT NULL,
	"profile" text NOT NULL,
	"prefetched_question" text,
	"transcript" text DEFAULT '' NOT NULL,
	"messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"report" jsonb,
	"last_error" text,
	"recoverable" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "interview_chunks" ADD CONSTRAINT "interview_chunks_session_id_interview_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."interview_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "interview_chunks_session_sequence_idx" ON "interview_chunks" USING btree ("session_id","sequence");--> statement-breakpoint
CREATE INDEX "interview_sessions_user_idx" ON "interview_sessions" USING btree ("user_email");--> statement-breakpoint
CREATE INDEX "interview_sessions_completed_idx" ON "interview_sessions" USING btree ("completed_at");