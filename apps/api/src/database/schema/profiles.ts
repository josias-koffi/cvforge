import type { StoredProfile } from "../../profiles/profiles.types";
import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/** One row per user: which profile is active, and the payload version. */
export const profileRegistries = pgTable("profile_registries", {
  userEmail: text("user_email").primaryKey(),
  activeProfileId: text("active_profile_id").notNull(),
  version: integer("version").notNull().default(2),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * The profiles of a registry, one row each. They were a nested array, and the
 * order carried meaning — `profiles[0]` is the fallback active profile — so
 * `position` preserves it.
 *
 * Both tables are new, so the cascade below is safe to declare here: deleting
 * a registry is the whole account purge for this module.
 */
export const profiles = pgTable(
  "profiles",
  {
    id: text("id").primaryKey(),
    userEmail: text("user_email")
      .notNull()
      .references(() => profileRegistries.userEmail, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    label: text("label").notNull().default("Profil"),
    headline: text("headline").notNull().default(""),
    identity: jsonb("identity").$type<StoredProfile["identity"]>().notNull(),
    preferences: jsonb("preferences")
      .$type<StoredProfile["preferences"]>()
      .notNull(),
    sections: jsonb("sections").$type<StoredProfile["sections"]>().notNull(),
    meta: jsonb("meta").$type<StoredProfile["meta"]>().notNull(),
  },
  // Serves the per-user lookup as well as guarding the ordering.
  (table) => [
    uniqueIndex("profiles_user_position_idx").on(table.userEmail, table.position),
  ],
);
