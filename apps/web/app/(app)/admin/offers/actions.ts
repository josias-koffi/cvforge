"use server"

import type {
  AdminCreditOfferMutationResponse,
  CreditOfferInput,
} from "@cvforge/types"
import { revalidatePath } from "next/cache"

import { api, ApiError, type ActionResult } from "@/lib/api"
import { requireAdminSession } from "@/lib/session"

const OFFERS_PATH = "/admin/offers"

function offerPath(id: string, suffix = "") {
  return `/admin/credit-offers/${encodeURIComponent(id)}${suffix}`
}

/**
 * The offer is saved even when Stripe fails; that case is reported as a
 * failure so the admin sees it, with the saved state already refreshed.
 */
async function mutateOffer(
  task: () => Promise<AdminCreditOfferMutationResponse>,
  successMessage: string
): Promise<ActionResult> {
  await requireAdminSession()

  try {
    const { stripeSyncError } = await task()
    return stripeSyncError
      ? { ok: false, message: `Offre enregistrée, mais ${stripeSyncError}` }
      : { ok: true, message: successMessage }
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, message: error.message }
    throw error
  } finally {
    revalidatePath(OFFERS_PATH)
  }
}

export async function createOffer(input: CreditOfferInput) {
  return mutateOffer(
    () =>
      api<AdminCreditOfferMutationResponse>("/admin/credit-offers", {
        body: input,
        method: "POST",
      }),
    "Offre créée et synchronisée avec Stripe."
  )
}

export async function updateOffer(id: string, input: CreditOfferInput) {
  return mutateOffer(
    () =>
      api<AdminCreditOfferMutationResponse>(offerPath(id), { body: input, method: "PUT" }),
    "Offre mise à jour."
  )
}

export async function archiveOffer(id: string) {
  return mutateOffer(
    () => api<AdminCreditOfferMutationResponse>(offerPath(id, "/archive"), { method: "POST" }),
    "Offre archivée."
  )
}

export async function featureOffer(id: string): Promise<ActionResult> {
  await requireAdminSession()

  try {
    await api(offerPath(id, "/feature"), { method: "POST" })
    return { ok: true, message: "Offre mise en avant." }
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, message: error.message }
    throw error
  } finally {
    revalidatePath(OFFERS_PATH)
  }
}

export async function syncOffersWithStripe(): Promise<ActionResult> {
  await requireAdminSession()

  try {
    const { results } = await api<{ results: AdminCreditOfferMutationResponse[] }>(
      "/admin/credit-offers/sync-stripe",
      { method: "POST" }
    )
    const failures = results.filter((result) => result.stripeSyncError)

    return failures.length === 0
      ? { ok: true, message: `${results.length} offre(s) synchronisée(s) avec Stripe.` }
      : {
          ok: false,
          message: `${failures.length} offre(s) non synchronisée(s) : ${failures[0].stripeSyncError}`,
        }
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, message: error.message }
    throw error
  } finally {
    revalidatePath(OFFERS_PATH)
  }
}
