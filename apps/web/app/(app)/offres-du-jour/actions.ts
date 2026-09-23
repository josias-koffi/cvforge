"use server"

import { revalidatePath } from "next/cache"

import { ApiError, api, runAction, type ActionResult } from "@/lib/api"
import type { JobMatchStatus } from "@/lib/job-search"

export async function setMatchStatus(
  jobId: string,
  status: Exclude<JobMatchStatus, "applied">
): Promise<ActionResult> {
  const result = await runAction(
    () =>
      api(`/job-search/offers/${encodeURIComponent(jobId)}`, {
        body: { status },
        method: "PATCH",
      }),
    status === "saved" ? "Offre gardée." : "Offre écartée."
  )

  revalidatePath("/offres-du-jour")
  revalidatePath("/offres")
  return result
}

/**
 * Creates the application and hands the candidate to the generation flow.
 *
 * A 410 means the employer took the advert down since this morning: no credit
 * was spent, and the page says so rather than showing a generic failure.
 */
export async function applyToMatch(
  jobId: string
): Promise<{ ok: true; applicationId: string } | { ok: false; message: string }> {
  try {
    const { applicationId } = await api<{ applicationId: string }>(
      `/job-search/offers/${encodeURIComponent(jobId)}/apply`,
      { method: "POST" }
    )

    revalidatePath("/offres-du-jour")
    revalidatePath("/offres")
    revalidatePath("/candidatures")
    return { applicationId, ok: true }
  } catch (error) {
    if (error instanceof ApiError && error.status === 410) {
      return {
        message:
          "Cette offre n'est plus disponible. Aucun crédit n'a été consommé.",
        ok: false,
      }
    }

    if (error instanceof ApiError) return { message: error.message, ok: false }

    throw error
  }
}
