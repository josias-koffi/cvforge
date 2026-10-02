"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { generateDocument } from "@/app/(app)/candidatures/actions"
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
): Promise<
  | { ok: true; applicationId: string; existing: boolean }
  | { ok: false; message: string }
> {
  try {
    const { applicationId, existing } = await api<{
      applicationId: string
      existing?: boolean
    }>(`/job-search/offers/${encodeURIComponent(jobId)}/apply`, {
      method: "POST",
    })

    revalidatePath("/offres-du-jour")
    revalidatePath("/offres")
    revalidatePath("/candidatures")
    return { applicationId, existing: existing ?? false, ok: true }
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

/**
 * « Postuler avec Jobspark » from an alert (US-167): the application, then
 * the tailored CV, in one go — the candidate lands on their CV being written.
 *
 * An offer already applied to opens its application instead: a second click
 * on the same e-mail must not pay for a second CV. On a failure — the offer
 * gone, a profile too thin, no credit left — the page says why and offers
 * the way on; an application already created is named so it is not lost.
 */
export async function applyFromAlert(
  jobId: string
): Promise<{ ok: false; message: string; applicationId?: string }> {
  const applied = await applyToMatch(jobId)
  if (!applied.ok) return applied

  if (applied.existing) redirect(`/candidatures/${applied.applicationId}`)

  // Redirects to the CV once it is written; returns only on a failure.
  const generated = await generateDocument(applied.applicationId, "cv")
  if (generated.ok) redirect(`/candidatures/${applied.applicationId}/cv`)

  return { ...generated, applicationId: applied.applicationId }
}
