"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { apiRequest } from "@/lib/api"
import { getAuthCookieName } from "@/lib/config"

export async function logout() {
  try {
    await apiRequest("/auth/logout", { method: "POST" })
  } catch {
    // The local cookie is cleared below even if the API is unreachable.
  }

  const cookieStore = await cookies()

  cookieStore.set(getAuthCookieName(), "", {
    domain: process.env.COOKIE_DOMAIN?.trim() || undefined,
    maxAge: 0,
    path: "/",
  })

  redirect("/login")
}
