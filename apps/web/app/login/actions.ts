"use server"

import { redirect } from "next/navigation"

import { getServerApiUrl } from "@/lib/config"

export type LoginState = { message: string } | null

export async function requestMagicLink(
  _previous: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim()
  const consentAccepted = formData.get("consent") === "on"

  if (!consentAccepted) {
    return { message: "Merci d'accepter le traitement de vos données." }
  }

  let response: Response

  try {
    response = await fetch(`${getServerApiUrl()}/auth/passwordless/request`, {
      body: JSON.stringify({ consentAccepted, email }),
      headers: { "content-type": "application/json" },
      method: "POST",
    })
  } catch {
    return { message: "Le service est momentanément indisponible." }
  }

  if (!response.ok) {
    return {
      message:
        response.status === 400
          ? "Adresse e-mail invalide."
          : "Impossible d'envoyer le lien de connexion.",
    }
  }

  redirect(`/login/check-email?email=${encodeURIComponent(email)}`)
}
