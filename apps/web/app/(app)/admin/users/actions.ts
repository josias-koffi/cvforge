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

export async function updateUserRole(email: string, role: "admin" | "user") {
  await requireAdminSession()
  const result = await runAction(
    () => api(userPath(email), { body: { role }, method: "PATCH" }),
    "Rôle mis à jour."
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
