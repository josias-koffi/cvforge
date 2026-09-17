import { asc, eq } from "drizzle-orm";
import type { Database } from "../database/database.types";
import { profileRegistries, profiles } from "../database/schema";
import type {
  ProfilesStore,
  StoredProfile,
  StoredProfileRegistry,
} from "./profiles.types";

type ProfileRow = typeof profiles.$inferSelect;

function toProfile(row: ProfileRow): StoredProfile {
  return {
    headline: row.headline,
    id: row.id,
    identity: row.identity,
    label: row.label,
    meta: row.meta,
    preferences: row.preferences,
    sections: row.sections,
  };
}

export class PgProfilesStore implements ProfilesStore {
  constructor(private readonly db: Database) {}

  /**
   * Replaces the user's whole registry, as the file store did. The rows are
   * deleted and re-inserted inside one transaction so `position` never
   * collides with itself mid-write.
   */
  save(userEmail: string, registry: StoredProfileRegistry) {
    const entry: StoredProfileRegistry = { ...registry, userEmail, version: 2 };

    return this.db.transaction(async (tx) => {
      const values = {
        activeProfileId: entry.activeProfileId,
        updatedAt: new Date(),
        userEmail,
        version: 2,
      };

      await tx
        .insert(profileRegistries)
        .values(values)
        .onConflictDoUpdate({
          target: profileRegistries.userEmail,
          set: values,
        });

      await tx.delete(profiles).where(eq(profiles.userEmail, userEmail));

      for (const [position, profile] of entry.profiles.entries()) {
        await tx.insert(profiles).values({
          headline: profile.headline,
          id: profile.id,
          identity: profile.identity,
          label: profile.label,
          meta: profile.meta,
          position,
          preferences: profile.preferences,
          sections: profile.sections,
          userEmail,
        });
      }

      return entry;
    });
  }

  /**
   * A registry with no profiles reads as absent, matching the file store —
   * the front-end treats an empty registry and a missing one the same way.
   */
  async findByUserEmail(userEmail: string) {
    const [registry] = await this.db
      .select()
      .from(profileRegistries)
      .where(eq(profileRegistries.userEmail, userEmail));

    if (!registry) {
      return null;
    }

    const rows = await this.db
      .select()
      .from(profiles)
      .where(eq(profiles.userEmail, userEmail))
      .orderBy(asc(profiles.position));

    if (rows.length === 0) {
      return null;
    }

    const stored = rows.map(toProfile);
    const activeProfileId = stored.some(
      ({ id }) => id === registry.activeProfileId,
    )
      ? registry.activeProfileId
      : stored[0]!.id;

    return {
      activeProfileId,
      profiles: stored,
      userEmail,
      version: 2,
    } satisfies StoredProfileRegistry;
  }

  /** Returns the number of registries removed — 1 or 0, as before. */
  async deleteByUserEmail(userEmail: string) {
    // `profiles.user_email` cascades, so the registry row is enough.
    const deleted = await this.db
      .delete(profileRegistries)
      .where(eq(profileRegistries.userEmail, userEmail))
      .returning({ userEmail: profileRegistries.userEmail });

    return deleted.length;
  }
}
