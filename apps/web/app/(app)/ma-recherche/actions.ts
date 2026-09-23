"use server"

import { revalidatePath } from "next/cache"
import type { SearchProject } from "@cvforge/types"

import { runAction, type ActionResult } from "@/lib/api"
import { requestSearchProjectPrefill, writeSearchProject } from "@/lib/search-project"

export async function saveSearchProject(project: SearchProject): Promise<ActionResult> {
  const result = await runAction(
    () => writeSearchProject(project),
    "Recherche enregistrée."
  )

  revalidatePath("/ma-recherche")
  return result
}

/**
 * Reads a draft from the profile — job titles, city, the legacy contract text.
 * Nothing is saved: the candidate reviews it in the form first.
 */
export async function prefillSearchProject(
  profileId: string
): Promise<{ ok: true; searchProject: SearchProject } | { ok: false; message: string }> {
  try {
    return { ok: true, searchProject: await requestSearchProjectPrefill(profileId) }
  } catch {
    return {
      ok: false,
      message: "Le pré-remplissage a échoué. Enregistrez d'abord le profil.",
    }
  }
}
