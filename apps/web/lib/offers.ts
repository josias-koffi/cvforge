import { notFound } from "next/navigation"
import type { DraftApplication } from "@cvforge/types"

import { api, ApiError } from "@/lib/api"

export async function loadOffer(offerId: string) {
  try {
    return await api<{ application: DraftApplication; offerText: string }>(
      `/applications/${encodeURIComponent(offerId)}/offer`
    )
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound()
    throw error
  }
}
