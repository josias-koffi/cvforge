"use server"

import { revalidatePath } from "next/cache"
import type {
  ProfileRomeCompetence,
  RomeAppellationOption,
  SearchProject,
  SearchProjectRomeAppellation,
} from "@cvforge/types"

import { runAction } from "@/lib/api"
import { writeCompetenceDismissal } from "@/lib/profile-competences"
import {
  requestSearchProjectPrefill,
  searchRomeAppellations,
  writeRomeDecision,
  writeSearchProject,
} from "@/lib/search-project"

type RomeResult =
  | { ok: true; message?: string; rome: SearchProjectRomeAppellation[] }
  | { ok: false; message: string }

/** Saved, then the ROME jobs as they now stand — ROMEO runs on save. */
export async function saveSearchProject(
  project: SearchProject
): Promise<RomeResult> {
  let rome: SearchProjectRomeAppellation[] = []
  const result = await runAction(async () => {
    rome = (await writeSearchProject(project)).rome
  }, "Recherche enregistrée.")

  revalidatePath("/ma-recherche")
  return result.ok ? { ...result, rome } : result
}

/** Confirming or dismissing a job applies at once: no second "save" to find. */
export async function decideRomeAppellation(
  profileId: string,
  code: string,
  decision: "confirm" | "dismiss"
): Promise<RomeResult> {
  let rome: SearchProjectRomeAppellation[] = []
  const result = await runAction(async () => {
    rome = await writeRomeDecision(profileId, code, decision)
  })

  revalidatePath("/ma-recherche")
  return result.ok ? { ...result, rome } : result
}

/** Removed for good: the next reading of the CV will not bring it back. */
export async function dismissProfileCompetence(
  profileId: string,
  code: string
): Promise<
  | { ok: true; competences: ProfileRomeCompetence[] }
  | { ok: false; message: string }
> {
  let competences: ProfileRomeCompetence[] = []
  const result = await runAction(async () => {
    competences = await writeCompetenceDismissal(profileId, code)
  })

  revalidatePath("/ma-recherche")
  return result.ok ? { ok: true, competences } : result
}

/** The autocomplete: an empty list rather than an error, the field stays usable. */
export async function findRomeAppellations(
  query: string
): Promise<RomeAppellationOption[]> {
  try {
    return await searchRomeAppellations(query)
  } catch {
    return []
  }
}

/**
 * Reads a draft from the profile — job titles, city, the legacy contract text.
 * Nothing is saved: the candidate reviews it in the form first.
 */
export async function prefillSearchProject(
  profileId: string
): Promise<
  { ok: true; searchProject: SearchProject } | { ok: false; message: string }
> {
  try {
    return {
      ok: true,
      searchProject: await requestSearchProjectPrefill(profileId),
    }
  } catch {
    return {
      ok: false,
      message: "Le pré-remplissage a échoué. Enregistrez d'abord le profil.",
    }
  }
}
