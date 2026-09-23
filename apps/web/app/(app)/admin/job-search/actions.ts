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
