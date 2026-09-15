"use server"

import { revalidatePath } from "next/cache"
import type { CVDocumentContent, LetterDocumentContent } from "@cvforge/types"

import { api, runAction } from "@/lib/api"

export async function saveCv(offerId: string, cvContent: CVDocumentContent) {
  const result = await runAction(
    () => api(`/applications/${offerId}/cv`, { body: { cvContent }, method: "PUT" }),
    "CV enregistré."
  )

  revalidatePath(`/candidatures/${offerId}/cv`)
  return result
}

export async function saveLetter(offerId: string, letterContent: LetterDocumentContent) {
  const result = await runAction(
    () =>
      api(`/applications/${offerId}/letter`, { body: { letterContent }, method: "PUT" }),
    "Lettre enregistrée."
  )

  revalidatePath(`/candidatures/${offerId}/letter`)
  return result
}
