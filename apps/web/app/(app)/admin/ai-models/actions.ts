"use server"

import type { AiFeature, AiModelChoice } from "@cvforge/types"
import { revalidatePath } from "next/cache"

import { api, ApiError, type ActionResult } from "@/lib/api"
import { requireAdminSession } from "@/lib/session"

async function mutateModel(
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
    revalidatePath("/admin/ai-models")
  }
}

const featurePath = (feature: AiFeature) =>
  `/admin/ai-models/${encodeURIComponent(feature)}`

export async function chooseAiModel(feature: AiFeature, choice: AiModelChoice) {
  return mutateModel(
    () => api(featurePath(feature), { body: choice, method: "PUT" }),
    "Modèle enregistré. Il s'applique sous une minute."
  )
}

export async function resetAiModel(feature: AiFeature) {
  return mutateModel(
    () => api(featurePath(feature), { method: "DELETE" }),
    "Retour au modèle par défaut."
  )
}

export async function saveAnthropicBalance(balanceUsd: number | null) {
  return mutateModel(
    () => api("/admin/ai-models/anthropic-balance", { body: { balanceUsd }, method: "PUT" }),
    balanceUsd === null ? "Solde retiré." : "Solde enregistré."
  )
}
