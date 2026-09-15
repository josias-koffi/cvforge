"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import type { DraftApplication } from "@cvforge/types"

import { api, ApiError, runAction, type ActionResult } from "@/lib/api"
import { splitLines } from "@/lib/format"
import { loadRegistry } from "@/lib/profile"
import { buildGenerationRequest, isProfileReady, pickProfile } from "@/lib/profile-model"
import { requireSession } from "@/lib/session"

export type FormState = { message: string } | null

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim()
}

export async function importOffer(
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const source = field(formData, "source")
  let application: DraftApplication

  try {
    ;({ application } = await api<{ application: DraftApplication }>(
      source === "text" ? "/applications/import-from-text" : "/applications/import-from-url",
      {
        body:
          source === "text"
            ? { offerText: field(formData, "offerText") }
            : { url: field(formData, "offerUrl") },
        method: "POST",
      }
    ))
  } catch (error) {
    if (error instanceof ApiError) return { message: error.message }
    throw error
  }

  revalidatePath("/", "layout")
  redirect(`/offers/${application.id}?notice=offer-created`)
}

export async function updateOffer(
  offerId: string,
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  try {
    await api(`/applications/${offerId}`, {
      body: {
        extracted: {
          companyName: field(formData, "companyName"),
          contractType: field(formData, "contractType"),
          language: field(formData, "language"),
          location: field(formData, "location"),
          requirements: splitLines(field(formData, "requirements")),
          responsibilities: splitLines(field(formData, "responsibilities")),
          salaryRange: field(formData, "salaryRange"),
          summary: field(formData, "summary"),
          title: field(formData, "title"),
        },
        offerText: field(formData, "offerText"),
        offerUrl: field(formData, "offerUrl"),
      },
      method: "PATCH",
    })
  } catch (error) {
    if (error instanceof ApiError) return { message: error.message }
    throw error
  }

  revalidatePath("/", "layout")
  redirect(`/offers/${offerId}?notice=offer-updated`)
}

export async function reExtractOffer(
  offerId: string,
  source: "text" | "url"
): Promise<ActionResult> {
  const result = await runAction(
    () =>
      api(`/applications/${offerId}/re-extract`, { body: { source }, method: "POST" }),
    "L'IA a ré-analysé l'offre."
  )

  revalidatePath("/", "layout")
  return result
}

export async function updateOfferStatus(
  offerId: string,
  status: string
): Promise<ActionResult> {
  const result = await runAction(
    () => api(`/applications/${offerId}/status`, { body: { status }, method: "POST" }),
    "Statut mis à jour."
  )

  revalidatePath("/", "layout")
  return result
}

export async function generateDocument(
  offerId: string,
  kind: "cv" | "letter",
  refinement?: string,
  profileId?: string
): Promise<ActionResult> {
  const session = await requireSession()
  const profile = pickProfile(await loadRegistry(session.email), profileId)

  if (!isProfileReady(profile)) {
    return {
      ok: false,
      message: "Complétez votre profil (au moins le prénom) avant de lancer la génération.",
    }
  }

  const result = await runAction(() =>
    api(`/applications/${offerId}/${kind === "cv" ? "generate-cv" : "generate-letter"}`, {
      body: { ...buildGenerationRequest(profile), ...(refinement ? { refinement } : {}) },
      method: "POST",
    })
  )

  if (!result.ok) return result

  revalidatePath("/", "layout")
  redirect(`/offers/${offerId}/${kind}?notice=${kind}-generated`)
}
