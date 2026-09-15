"use server"

import { revalidatePath } from "next/cache"
import type { ImportedCvExtractionResult } from "@cvforge/types"

import { getCookieHeader, runAction, type ActionResult } from "@/lib/api"
import { getServerApiUrl } from "@/lib/config"
import { loadActiveProfile, saveActiveProfile } from "@/lib/profile"
import type { BaseProfile } from "@/lib/profile-model"
import { requireSession } from "@/lib/session"

export async function saveProfile(profile: BaseProfile): Promise<ActionResult> {
  const session = await requireSession()
  const { registry } = await loadActiveProfile(session.email)
  const result = await runAction(
    () => saveActiveProfile(profile, registry),
    "Profil enregistré."
  )

  revalidatePath("/profile")
  return result
}

const importErrors: Record<number, string> = {
  400: "Fichier invalide. Importez un PDF ou un DOCX de moins de 5 Mo.",
  402: "Crédits insuffisants pour importer ce CV.",
  422: "Aucune information exploitable n'a été trouvée dans ce CV (PDF scanné ou illisible ?). Aucun crédit n'a été débité.",
}

export async function importCvFile(
  formData: FormData
): Promise<{ ok: true; result: ImportedCvExtractionResult } | { ok: false; message: string }> {
  const file = formData.get("cvFile")

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Choisissez un fichier PDF ou DOCX." }
  }

  const body = new FormData()
  body.set("cvFile", file, file.name)
  const cookie = await getCookieHeader()
  const response = await fetch(`${getServerApiUrl()}/applications/cv-import/extract`, {
    body,
    headers: cookie ? { cookie } : undefined,
    method: "POST",
  })

  if (!response.ok) {
    return {
      ok: false,
      message: importErrors[response.status] ?? "L'import du CV a échoué. Réessayez.",
    }
  }

  revalidatePath("/", "layout")
  return { ok: true, result: (await response.json()) as ImportedCvExtractionResult }
}
