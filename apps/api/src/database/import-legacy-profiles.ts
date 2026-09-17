import { existsSync, readFileSync } from "node:fs";
import { normalizeProfile } from "../profiles/profiles.normalize";
import type { StoredProfileRegistry } from "../profiles/profiles.types";
import type { Database } from "./database.types";
import { dataImports, profileRegistries, profiles } from "./schema";

export const LEGACY_PROFILES_IMPORT = "profiles-state.json";

export type LegacyProfilesImportResult =
  | { status: "already_imported" }
  | { status: "imported"; registries: number; profiles: number };

function readLegacyRegistries(
  filePath: string,
): Array<[string, StoredProfileRegistry]> {
  if (!existsSync(filePath)) {
    return [];
  }

  const parsed = JSON.parse(readFileSync(filePath, "utf8")) as {
    registries?: Record<string, StoredProfileRegistry>;
  };

  return Object.entries(parsed.registries ?? {});
}

/**
 * Copies the JSON profile registries into Postgres once per environment.
 *
 * A registry whose profiles are all unusable read as absent through the file
 * store, so it is skipped here rather than written as an empty registry that
 * `findByUserEmail` would refuse to return anyway. `active_profile_id` is
 * repaired the same way the store's normalizer did: it falls back to the first
 * profile when it points at nothing.
 *
 * A missing file is recorded as imported too: there is nothing left to copy.
 */
export async function importLegacyProfiles(
  db: Database,
  filePath: string,
): Promise<LegacyProfilesImportResult> {
  return db.transaction(async (tx) => {
    const claimed = await tx
      .insert(dataImports)
      .values({ name: LEGACY_PROFILES_IMPORT })
      .onConflictDoNothing()
      .returning({ name: dataImports.name });

    if (claimed.length === 0) {
      return { status: "already_imported" };
    }

    let importedRegistries = 0;
    let importedProfiles = 0;

    for (const [userEmail, registry] of readLegacyRegistries(filePath)) {
      // Same repairs the file store applied on read: the columns below are
      // `not null` and a raw legacy record may be missing any of them.
      const owned = Array.isArray(registry?.profiles)
        ? registry.profiles
            .map(normalizeProfile)
            .filter((profile) => profile !== null)
        : [];

      if (owned.length === 0) {
        continue;
      }

      const activeProfileId = owned.some(
        ({ id }) => id === registry.activeProfileId,
      )
        ? registry.activeProfileId
        : owned[0]!.id;

      await tx
        .insert(profileRegistries)
        .values({ activeProfileId, userEmail, version: 2 })
        .onConflictDoNothing();

      for (const [position, profile] of owned.entries()) {
        await tx
          .insert(profiles)
          .values({
            headline: profile.headline,
            id: profile.id,
            identity: profile.identity,
            label: profile.label,
            meta: profile.meta,
            position,
            preferences: profile.preferences,
            sections: profile.sections,
            userEmail,
          })
          .onConflictDoNothing();
      }

      importedRegistries += 1;
      importedProfiles += owned.length;
    }

    return {
      status: "imported",
      registries: importedRegistries,
      profiles: importedProfiles,
    };
  });
}
