"use server"

import { revalidatePath } from "next/cache"

import { api, ApiError, runAction, type ActionResult } from "@/lib/api"
import { requireAdminSession } from "@/lib/session"

const USERS_PATH = "/admin/users"

function userPath(email: string) {
  return `/admin/users/${encodeURIComponent(email)}`
}

export async function inviteUser(
  email: string,
  role: "admin" | "user"
): Promise<ActionResult & { invitationUrl?: string }> {
  await requireAdminSession()

  try {
    const invitation = await api<{ invitationUrl: string }>("/auth/invitations", {
      body: { email, role },
      method: "POST",
    })
    return { ok: true, invitationUrl: invitation.invitationUrl, message: "Invitation créée." }
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, message: error.message }
    throw error
  }
}

/**
 * Demotion only — the API rejects `{ role: "admin" }`. Granting the admin role
 * goes through `inviteUser` and nothing else (vision §3.2).
 */
export async function demoteUser(email: string) {
  await requireAdminSession()
  const result = await runAction(
    () => api(userPath(email), { body: { role: "user" }, method: "PATCH" }),
    "Utilisateur rétrogradé."
  )

  revalidatePath(USERS_PATH)
  return result
}

export async function grantUserCredits(email: string, credits: number, note: string) {
  await requireAdminSession()
  const result = await runAction(
    () =>
      api("/credits/admin/grants", {
        body: { credits, note, userEmail: email },
        method: "POST",
      }),
    `${credits} crédits ajoutés.`
  )

  revalidatePath("/", "layout")
  return result
}

export async function deleteUser(email: string) {
  await requireAdminSession()
  const result = await runAction(
    () => api(userPath(email), { method: "DELETE" }),
    "Utilisateur et données supprimés."
  )

  revalidatePath(USERS_PATH)
  return result
}
