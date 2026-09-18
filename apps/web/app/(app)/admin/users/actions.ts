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

/** The API re-checks the confirmation email; this is not the only guard. */
export async function deleteUser(
  email: string,
  confirmationEmail: string,
  note?: string
) {
  await requireAdminSession()
  const result = await runAction(
    () =>
      api(userPath(email), {
        body: { confirmationEmail, note },
        method: "DELETE",
      }),
    "Utilisateur et données supprimés."
  )

  revalidatePath(USERS_PATH)
  return result
}

export async function setUserStatus(
  email: string,
  status: "active" | "suspended",
  note?: string
) {
  await requireAdminSession()
  const result = await runAction(
    () => api(`${userPath(email)}/status`, { body: { note, status }, method: "PATCH" }),
    status === "suspended" ? "Compte suspendu." : "Compte réactivé."
  )

  revalidatePath(USERS_PATH)
  return result
}

export async function revokeUserSessions(email: string, note?: string) {
  await requireAdminSession()
  const result = await runAction(
    () =>
      api(`${userPath(email)}/revoke-sessions`, { body: { note }, method: "POST" }),
    "Sessions révoquées : l'utilisateur devra se reconnecter."
  )

  revalidatePath(USERS_PATH)
  return result
}
