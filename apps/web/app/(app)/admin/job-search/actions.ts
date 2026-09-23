"use server"

import { revalidatePath } from "next/cache"

import { api, ApiError, type ActionResult } from "@/lib/api"
import { requireAdminSession } from "@/lib/session"

const PAGE_PATH = "/admin/job-search"

async function mutate(
  task: () => Promise<unknown>,
  successMessage: string
): Promise<ActionResult> {
  await requireAdminSession()

  try {
    await task()

    return { ok: true, message: successMessage }
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, message: error.message }
    throw error
  } finally {
    // Revalidated even on failure: the row the admin acted on may well have
    // changed under them, and a stale table is what made them act.
    revalidatePath(PAGE_PATH)
  }
}

/**
 * Asks for a collection and returns at once: it takes minutes, so the page
 * polls the run rather than holding the request open. The API answers 202 and
 * `started: false` when one is already running — the lock working, not an
 * error, so the message says so plainly.
 */
export async function startCollection(sinceDays: number) {
  await requireAdminSession()

  try {
    const { started } = await api<{ started: boolean }>(
      "/admin/job-search/runs",
      { body: { sinceDays }, method: "POST" }
    )

    return {
      ok: true,
      message: started
        ? "Collecte lancée. Son avancement s'affiche ci-dessous."
        : "Une collecte est déjà en cours. Attendez qu'elle finisse.",
    } satisfies ActionResult
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, message: error.message }
    throw error
  } finally {
    revalidatePath(PAGE_PATH)
  }
}

/** Registers the companies shipped with the code. Replaying it is harmless. */
export async function importSeedBoards() {
  await requireAdminSession()

  try {
    const report = await api<{ registered: number; skipped: number }>(
      "/admin/job-search/boards/seed",
      { method: "POST" }
    )

    return {
      ok: true,
      message: `${report.registered} entreprise(s) enregistrée(s). Elles seront lues à la prochaine collecte.`,
    } satisfies ActionResult
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, message: error.message }
    throw error
  } finally {
    revalidatePath(PAGE_PATH)
  }
}

export async function setSourceEnabled(source: string, enabled: boolean) {
  return mutate(
    () =>
      api(`/admin/job-search/sources/${encodeURIComponent(source)}`, {
        body: { enabled },
        method: "PATCH",
      }),
    enabled
      ? "Source réactivée. Elle sera interrogée à la prochaine collecte."
      : "Source coupée. Elle ne sera plus appelée, même pour vérifier une offre."
  )
}

/** Adds a company from the URL of one of its adverts. */
export async function addBoard(url: string, companyName: string) {
  return mutate(
    () =>
      api("/admin/job-boards", {
        body: { companyName: companyName.trim() || undefined, url: url.trim() },
        method: "POST",
      }),
    "Entreprise ajoutée. Elle sera lue à la prochaine collecte."
  )
}

export async function setBoardEnabled(
  provider: string,
  boardToken: string,
  enabled: boolean
) {
  return mutate(
    () =>
      api(
        `/admin/job-boards/${encodeURIComponent(provider)}/${encodeURIComponent(boardToken)}`,
        { body: { enabled }, method: "PATCH" }
      ),
    enabled
      ? "Entreprise réactivée. Son compteur d'échecs repart à zéro."
      : "Entreprise désactivée. Ses offres déjà collectées restent en base."
  )
}

/** Undoes a wrong merge: the advert becomes an offer of its own again. */
export async function detachListing(listingId: string) {
  return mutate(
    () =>
      api(`/admin/job-boards/merges/${encodeURIComponent(listingId)}/detach`, {
        method: "POST",
      }),
    "Annonce séparée. Elle redevient une offre à part entière."
  )
}
