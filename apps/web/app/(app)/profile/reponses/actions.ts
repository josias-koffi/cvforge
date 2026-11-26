"use server"

import type { ScreeningAnswers } from "@cvforge/types"
import { revalidatePath } from "next/cache"

import { api, runAction, type ActionResult } from "@/lib/api"
import { requireSession } from "@/lib/session"

/** Saves the whole form: the API trims, drops empty answers and duplicates. */
export async function saveScreeningAnswers(
  answers: Pick<ScreeningAnswers, "known" | "custom">
): Promise<ActionResult> {
  await requireSession()

  const result = await runAction(
    () => api("/screening-answers", { body: answers, method: "PUT" }),
    "Réponses enregistrées."
  )
  if (result.ok) revalidatePath("/profile/reponses")
  return result
}
