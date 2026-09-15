import { cache } from "react"
import { redirect } from "next/navigation"

import { apiRequest } from "@/lib/api"

export type AppSession = {
  email: string
  expiresAt: string
  role: "admin" | "user"
}

async function fetchSession(endpoint: "/auth/session" | "/auth/session/admin") {
  let response: Response

  try {
    response = await apiRequest(endpoint)
  } catch {
    redirect("/login?error=session_unavailable")
  }

  if (response.status === 401) {
    redirect("/login?error=session_required")
  }

  if (response.status === 403) {
    redirect("/forbidden")
  }

  if (!response.ok) {
    redirect("/login?error=session_unavailable")
  }

  const payload = (await response.json()) as { session: AppSession }

  return payload.session
}

export const requireSession = cache(() => fetchSession("/auth/session"))

export const requireAdminSession = cache(() =>
  fetchSession("/auth/session/admin")
)
