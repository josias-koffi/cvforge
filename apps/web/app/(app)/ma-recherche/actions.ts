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
  pickAlerts,
  readSearchProject,
  requestSearchProjectPrefill,
  type SearchAlerts,
  searchRomeAppellations,
  writeRomeDecision,
  writeSearchProject,
} from "@/lib/search-project"

type RomeResult =
  | { ok: true; message?: string; rome: SearchProjectRomeAppellation[] }
  | { ok: false; message: string }

/** Every tab reads the same project: whichever saves refreshes them all. */
function revalidateSearch() {
  revalidatePath("/ma-recherche", "layout")
}

/**
 * The criteria, saved, then the ROME jobs as they now stand — ROMEO runs on
 * save. The alerts are taken from the stored project: they belong to their
 * own tab, and a criteria form left open must not undo them.
 */
export async function saveSearchProject(
  project: SearchProject
): Promise<RomeResult> {
  let rome: SearchProjectRomeAppellation[] = []
  const result = await runAction(async () => {
    const { searchProject: stored } = await readSearchProject(project.profileId)
    rome = (await writeSearchProject({ ...project, ...pickAlerts(stored) }))
      .rome
  }, "Critères enregistrés.")

  revalidateSearch()
  return result.ok ? { ...result, rome } : result
}

/** The alerts alone, on top of the stored criteria. Applies at once. */
export async function saveSearchAlerts(
  profileId: string,
  alerts: SearchAlerts
): Promise<
  { ok: true; alerts: SearchAlerts } | { ok: false; message: string }
> {
  let saved = alerts
  const result = await runAction(async () => {
    const { searchProject: stored } = await readSearchProject(profileId)
    saved = pickAlerts(
      (await writeSearchProject({ ...stored, ...pickAlerts(alerts) }))
        .searchProject
    )
  })

  revalidateSearch()
  return result.ok ? { ok: true, alerts: saved } : result
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

  revalidateSearch()
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

  revalidateSearch()
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
