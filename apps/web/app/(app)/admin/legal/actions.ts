"use server"

import type { LegalDocumentInput, LegalDocumentSlug } from "@cvforge/types"
import { revalidatePath } from "next/cache"

import { api, ApiError, type ActionResult } from "@/lib/api"
import { requireAdminSession } from "@/lib/session"

const LEGAL_PATH = "/admin/legal"

function documentPath(slug: LegalDocumentSlug, suffix = "") {
  return `/admin/legal/${encodeURIComponent(slug)}${suffix}`
}

async function mutateDocument(
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
    revalidatePath(LEGAL_PATH)
  }
}

export async function saveLegalDocument(
  slug: LegalDocumentSlug,
  input: LegalDocumentInput
) {
  return mutateDocument(
    () => api(documentPath(slug), { body: input, method: "PUT" }),
    "Brouillon enregistré. Publiez-le pour le mettre en ligne."
  )
}

/**
 * Publishing is what puts the text online and bumps its version; it is
 * deliberately a second, explicit click after saving.
 */
export async function publishLegalDocument(slug: LegalDocumentSlug) {
  return mutateDocument(
    () => api(documentPath(slug, "/publish"), { method: "POST" }),
    "Document publié. Le site public le servira sous quelques minutes."
  )
}
