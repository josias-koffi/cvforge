"use server"

import { revalidatePath } from "next/cache"
import type { ImportedCvExtractionResult } from "@cvforge/types"

import { getCookieHeader, runAction, type ActionResult } from "@/lib/api"
import { getServerApiUrl } from "@/lib/config"
import { loadRegistry, writeRegistry } from "@/lib/profile"
import {
  pickProfile,
  duplicateBaseProfile,
  type BaseProfile,
  type ProfileRegistry,
} from "@/lib/profile-model"
import { requireSession } from "@/lib/session"

type ProfileActionResult = ActionResult & { profileId?: string }

/** Loads the registry, applies a change and writes the whole registry back. */
async function mutateRegistry(
  change: (registry: ProfileRegistry) => ProfileRegistry | { error: string },
  successMessage: string
): Promise<ActionResult> {
  const session = await requireSession()
  const next = change(await loadRegistry(session.email))

  if ("error" in next) return { ok: false, message: next.error }

  const result = await runAction(
    () => writeRegistry(next.profiles, next.activeProfileId),
    successMessage
  )

  revalidatePath("/", "layout")
  return result
}

const PROFILE_CONFLICT_MESSAGE =
  "Ce profil a été modifié ailleurs (par un agent connecté ou un autre onglet). " +
  "Rechargez la page pour récupérer la dernière version : vos modifications non enregistrées seraient sinon écrasées."

/**
 * Saves one profile of the registry.
 *
 * `expectedLastSavedAt` is the save the editor loaded. When the stored profile
 * has moved on since (an agent wrote to it through the MCP server, another tab
 * saved it), the save is refused instead of silently erasing those changes.
 * Leave it undefined to skip the check (onboarding, which creates the profile).
 */
export async function saveProfile(
  profile: BaseProfile,
  expectedLastSavedAt?: string | null
): Promise<ActionResult & { lastSavedAt?: string }> {
  const lastSavedAt = new Date().toISOString()
  const saved: BaseProfile = {
    ...profile,
    meta: { ...profile.meta, lastSavedAt, source: "storage" },
  }

  const result = await mutateRegistry((registry) => {
    const current = registry.profiles.find((item) => item.id === saved.id)

    if (
      current &&
      expectedLastSavedAt !== undefined &&
      (current.meta.lastSavedAt ?? null) !== expectedLastSavedAt
    ) {
      return { error: PROFILE_CONFLICT_MESSAGE }
    }

    const profiles = current
      ? registry.profiles.map((item) => (item.id === saved.id ? saved : item))
      : [...registry.profiles, saved]
    return { ...registry, profiles }
  }, "Profil enregistré.")

  return result.ok ? { ...result, lastSavedAt } : result
}

export async function duplicateProfile(
  id: string
): Promise<ProfileActionResult> {
  let copyId: string | undefined
  const result = await mutateRegistry((registry) => {
    const copy = duplicateBaseProfile(pickProfile(registry, id))
    copyId = copy.id
    return { ...registry, profiles: [...registry.profiles, copy] }
  }, "Profil dupliqué.")

  return result.ok ? { ...result, profileId: copyId } : result
}

export async function deleteProfile(id: string): Promise<ActionResult> {
  return mutateRegistry((registry) => {
    if (registry.profiles.length <= 1) {
      return { error: "Vous devez conserver au moins un profil." }
    }

    const remaining = registry.profiles.filter((item) => item.id !== id)
    const activeProfileId =
      registry.activeProfileId === id
        ? remaining[0].id
        : registry.activeProfileId
    return { ...registry, activeProfileId, profiles: remaining }
  }, "Profil supprimé.")
}

export async function setDefaultProfile(id: string): Promise<ActionResult> {
  return mutateRegistry(
    (registry) => ({ ...registry, activeProfileId: id }),
    "Profil défini par défaut."
  )
}

const importErrors: Record<number, string> = {
  400: "Fichier invalide. Importez un PDF ou un DOCX de moins de 5 Mo.",
  402: "Crédits insuffisants pour importer ce CV.",
  422: "Aucune information exploitable n'a été trouvée dans ce CV (scan flou ou fichier illisible ?). Aucun crédit n'a été débité.",
}

export async function importCvFile(
  formData: FormData
): Promise<
  | { ok: true; result: ImportedCvExtractionResult }
  | { ok: false; message: string }
> {
  const file = formData.get("cvFile")

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Choisissez un fichier PDF ou DOCX." }
  }

  const body = new FormData()
  body.set("cvFile", file, file.name)
  const cookie = await getCookieHeader()
  const response = await fetch(
    `${getServerApiUrl()}/applications/cv-import/extract`,
    {
      body,
      headers: cookie ? { cookie } : undefined,
      method: "POST",
    }
  )

  if (!response.ok) {
    return {
      ok: false,
      message:
        importErrors[response.status] ?? "L'import du CV a échoué. Réessayez.",
    }
  }

  revalidatePath("/", "layout")
  return {
    ok: true,
    result: (await response.json()) as ImportedCvExtractionResult,
  }
}
