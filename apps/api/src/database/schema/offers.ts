import type {
  CreditOfferStatus,
  CreditOrderStatus,
  LocalizedList,
  LocalizedText,
} from "@cvforge/types";
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

/**
 * Credit packs managed from the back-office. The Stripe ids belong to the
 * environment's own Stripe account (sandbox on staging, live in production).
 */
export const creditOffers = pgTable(
  "credit_offers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    status: text("status").$type<CreditOfferStatus>().notNull().default("draft"),
    name: jsonb("name").$type<LocalizedText>().notNull(),
    description: jsonb("description").$type<LocalizedText>().notNull(),
    features: jsonb("features").$type<LocalizedList>().notNull(),
    credits: integer("credits").notNull(),
    priceCents: integer("price_cents").notNull(),
    currency: text("currency").$type<"eur">().notNull().default("eur"),
    isFeatured: boolean("is_featured").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    stripeProductId: text("stripe_product_id").unique(),
    stripePriceId: text("stripe_price_id").unique(),
    stripeSyncedAt: timestamp("stripe_synced_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check("credit_offers_credits_positive", sql`${table.credits} > 0`),
    check("credit_offers_price_minimum", sql`${table.priceCents} >= 500`),
    check(
      "credit_offers_status_valid",
      sql`${table.status} in ('draft', 'active', 'archived')`,
    ),
    // At most one featured offer on sale at a time.
    uniqueIndex("credit_offers_single_featured_idx")
      .on(table.isFeatured)
      .where(sql`${table.isFeatured} and ${table.status} = 'active'`),
  ],
);

/**
 * One row per Checkout Session. Credits and price are copied from the offer
 * at checkout time, so editing an offer never changes what a buyer receives.
 */
export const creditOrders = pgTable(
  "credit_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userEmail: text("user_email").notNull(),
    offerId: uuid("offer_id")
      .notNull()
      .references(() => creditOffers.id),
    offerName: jsonb("offer_name").$type<LocalizedText>().notNull(),
    credits: integer("credits").notNull(),
    priceCents: integer("price_cents").notNull(),
    currency: text("currency").$type<"eur">().notNull(),
    status: text("status").$type<CreditOrderStatus>().notNull().default("pending"),
    stripeCheckoutSessionId: text("stripe_checkout_session_id").unique(),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    ledgerEntryId: uuid("ledger_entry_id"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("credit_orders_user_created_idx").on(table.userEmail, table.createdAt),
    check(
      "credit_orders_status_valid",
      sql`${table.status} in ('pending', 'paid', 'failed', 'expired')`,
    ),
  ],
);
