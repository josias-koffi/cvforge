import { NextResponse } from "next/server"

import { getServerApiUrl } from "@/lib/config"

export async function POST(request: Request) {
  const formData = await request.formData()
  const token = String(formData.get("token") ?? "").trim()
  const consentAccepted = formData.get("consent") === "on"
  const errorUrl = new URL("/register/invitation", request.url)

  errorUrl.searchParams.set("token", token)

  if (!consentAccepted) {
    errorUrl.searchParams.set("error", "consent_required")
    return NextResponse.redirect(errorUrl, 303)
  }

  const response = await fetch(`${getServerApiUrl()}/auth/invitations/consume`, {
    body: JSON.stringify({ consentAccepted, token }),
    headers: { "content-type": "application/json" },
    method: "POST",
  })

  if (!response.ok) {
    errorUrl.searchParams.set("error", "consume_failed")
    return NextResponse.redirect(errorUrl, 303)
  }

  // Through the sign-in landing, which sends a first sign-in to the
  // onboarding (US-150).
  const success = NextResponse.redirect(
    new URL("/login/success", request.url),
    303
  )
  const sessionCookie = response.headers.get("set-cookie")

  if (sessionCookie) {
    success.headers.set("set-cookie", sessionCookie)
  }

  return success
}
