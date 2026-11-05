import { PayloadTooLargeException, UnprocessableEntityException } from "@nestjs/common";
import type { StoredProfileRegistry } from "./profiles.types";

/** A user holds a handful of profiles; this only stops a runaway client. */
export const MAX_PROFILES_PER_USER = 25;
const MAX_REGISTRY_BYTES = 512 * 1024;
const MAX_ID_LENGTH = 100;
const MAX_LABEL_LENGTH = 300;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Bounds what a client may store. The registry is written to the database as
 * sent, so its size, its count of profiles and the shape of each row are
 * checked here; the content itself is left as the editor produced it.
 */
export function assertStorableRegistry(registry: StoredProfileRegistry) {
  if (registry.profiles.length > MAX_PROFILES_PER_USER) {
    throw new UnprocessableEntityException(
      `Un compte ne peut pas contenir plus de ${MAX_PROFILES_PER_USER} profils.`,
    );
  }

  if (Buffer.byteLength(JSON.stringify(registry), "utf8") > MAX_REGISTRY_BYTES) {
    throw new PayloadTooLargeException("Les profils enregistres sont trop volumineux.");
  }

  const ids = new Set<string>();

  for (const profile of registry.profiles as unknown[]) {
    if (!isRecord(profile)) {
      throw new UnprocessableEntityException("Profil invalide.");
    }

    const { id, label, headline } = profile;

    if (typeof id !== "string" || !id || id.length > MAX_ID_LENGTH || ids.has(id)) {
      throw new UnprocessableEntityException("Identifiant de profil invalide ou duplique.");
    }

    ids.add(id);

    for (const text of [label, headline]) {
      if (text !== undefined && (typeof text !== "string" || text.length > MAX_LABEL_LENGTH)) {
        throw new UnprocessableEntityException("Libelle de profil invalide.");
      }
    }

    for (const key of ["identity", "sections", "preferences", "meta"] as const) {
      if (profile[key] !== undefined && !isRecord(profile[key])) {
        throw new UnprocessableEntityException(`Profil invalide : ${key}.`);
      }
    }
  }
}
