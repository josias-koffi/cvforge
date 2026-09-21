"use server"

import { redirect } from "next/navigation"

import { api, ApiError, type ActionResult } from "@/lib/api"
import { requireSession } from "@/lib/session"

/**
 * Erases the account. The API re-checks the typed email against the session
 * and clears the cookie itself, so there is nothing left to sign out from.
 */
export async function deleteOwnAccount(
  confirmationEmail: string
): Promise<ActionResult> {
  await requireSession()

  try {
    await api("/privacy/delete-account", {
      body: { confirmationEmail },
      method: "POST",
    })
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        ok: false,
        message:
          error.status === 400
            ? "L'adresse saisie ne correspond pas à votre compte."
            : error.message,
      }
    }

    throw error
  }

  redirect("/login?deleted=1")
}
