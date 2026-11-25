"use server"

import { redirect } from "next/navigation"
import type { OAuthConsentDecision } from "@cvforge/types"

import { api, ApiError } from "@/lib/api"

/**
 * The user's answer on the consent page. The API returns the agent's
 * redirect URI with the code (or `access_denied`); the browser goes there.
 */
export async function decideAgentAccess(
  decision: OAuthConsentDecision
): Promise<{ message: string }> {
  let redirectTo: string

  try {
    ;({ redirectTo } = await api<{ redirectTo: string }>("/oauth/consent", {
      body: decision,
      method: "POST",
    }))
  } catch (error) {
    if (error instanceof ApiError) {
      return { message: error.message }
    }

    throw error
  }

  redirect(redirectTo)
}
