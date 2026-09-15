import type { Metadata } from "next"

import { AuthLayout } from "@/components/auth/auth-layout"
import { LoginForm } from "@/components/auth/login-form"

export const metadata: Metadata = { title: "Connexion" }

const notices: Record<string, string> = {
  session_required: "Votre session a expiré, reconnectez-vous.",
  session_unavailable: "Le service est momentanément indisponible.",
}

export default async function LoginPage(props: PageProps<"/login">) {
  const { error } = await props.searchParams
  const notice = typeof error === "string" ? notices[error] : undefined

  return (
    <AuthLayout>
      <LoginForm notice={notice} />
    </AuthLayout>
  )
}
