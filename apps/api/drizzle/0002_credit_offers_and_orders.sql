CREATE TABLE "credit_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"name" jsonb NOT NULL,
	"description" jsonb NOT NULL,
	"features" jsonb NOT NULL,
	"credits" integer NOT NULL,
	"price_cents" integer NOT NULL,
	"currency" text DEFAULT 'eur' NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"stripe_product_id" text,
	"stripe_price_id" text,
	"stripe_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_offers_slug_unique" UNIQUE("slug"),
	CONSTRAINT "credit_offers_stripe_product_id_unique" UNIQUE("stripe_product_id"),
	CONSTRAINT "credit_offers_stripe_price_id_unique" UNIQUE("stripe_price_id"),
	CONSTRAINT "credit_offers_credits_positive" CHECK ("credit_offers"."credits" > 0),
	CONSTRAINT "credit_offers_price_minimum" CHECK ("credit_offers"."price_cents" >= 500),
	CONSTRAINT "credit_offers_status_valid" CHECK ("credit_offers"."status" in ('draft', 'active', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "credit_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_email" text NOT NULL,
	"offer_id" uuid NOT NULL,
	"offer_name" jsonb NOT NULL,
	"credits" integer NOT NULL,
	"price_cents" integer NOT NULL,
	"currency" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"stripe_checkout_session_id" text,
	"stripe_payment_intent_id" text,
	"ledger_entry_id" uuid,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_orders_stripe_checkout_session_id_unique" UNIQUE("stripe_checkout_session_id"),
	CONSTRAINT "credit_orders_status_valid" CHECK ("credit_orders"."status" in ('pending', 'paid', 'failed', 'expired'))
);
--> statement-breakpoint
ALTER TABLE "credit_orders" ADD CONSTRAINT "credit_orders_offer_id_credit_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."credit_offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "credit_offers_single_featured_idx" ON "credit_offers" USING btree ("is_featured") WHERE "credit_offers"."is_featured" and "credit_offers"."status" = 'active';--> statement-breakpoint
CREATE INDEX "credit_orders_user_created_idx" ON "credit_orders" USING btree ("user_email","created_at");