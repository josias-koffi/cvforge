"use server"

import { revalidatePath } from "next/cache"

import { ApiError, api } from "@/lib/api"

/**
 * A spontaneous application to a company of the list (US-120). Creating it is
 * free; the CV and the letter cost credits on the application page, as always.
 */
export async function applySpontaneously(
  profileId: string,
  siret: string
): Promise<
  | { ok: true; applicationId: string; existing: boolean }
  | { ok: false; message: string }
> {
  try {
    const { applicationId, outcome } = await api<{
      applicationId: string
      outcome: "created" | "existing"
    }>(
      `/profiles/${encodeURIComponent(profileId)}/hiring-companies/${encodeURIComponent(siret)}/apply`,
      { method: "POST" }
    )

    revalidatePath("/candidatures")
    return { applicationId, existing: outcome === "existing", ok: true }
  } catch (error) {
    if (error instanceof ApiError) return { message: error.message, ok: false }

    throw error
  }
}
