"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { api, runAction, type ActionResult } from "@/lib/api"

/**
 * Ends the session and scores it.
 *
 * A server action rather than a route handler: it is the one write that must
 * invalidate the cached pages and send the candidate to their report. The
 * per-turn calls stay route handlers — an action revalidates the router on
 * every call, which would re-render the studio mid-interview.
 */
export async function finishInterview(sessionId: string): Promise<ActionResult> {
  const result = await runAction(() =>
    api(`/interviews/sessions/${encodeURIComponent(sessionId)}/finish`, {
      method: "POST",
    })
  )

  if (!result.ok) return result

  revalidatePath("/entretiens")
  redirect(`/entretiens/${sessionId}/rapport`)
}
