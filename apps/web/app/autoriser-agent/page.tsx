import type { Metadata } from "next"
import type { OAuthConsentRequest } from "@cvforge/types"

import { OAuthConsentForm } from "@/components/account/agents/oauth-consent-form"
import { AuthLayout } from "@/components/auth/auth-layout"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { api, ApiError, apiRequest } from "@/lib/api"
import type { AppSession } from "@/lib/session"

export const metadata: Metadata = { title: "Autoriser un agent" }

function Notice({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children?: React.ReactNode
}) {
  return (
    <AuthLayout>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        {children ? (
          <CardFooter className="flex gap-2">{children}</CardFooter>
        ) : null}
      </Card>
    </AuthLayout>
  )
}

/**
 * The OAuth consent page (ADR-033): an agent such as claude.ai sent the user
 * here from `/oauth/authorize`. Outside the app shell, which would redirect a
 * signed-out user to the login page and lose the request.
 */
export default async function AuthorizeAgentPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { request } = await props.searchParams
  const here = `/autoriser-agent?request=${encodeURIComponent(String(request ?? ""))}`

  if (typeof request !== "string" || !request) {
    return (
      <Notice
        title="Demande incomplète"
        description="Relancez la connexion depuis votre agent (Claude, ChatGPT…)."
      />
    )
  }

  const sessionResponse = await apiRequest("/auth/session")

  if (sessionResponse.status === 401) {
    return (
      <Notice
        title="Connectez-vous à JobSpark"
        description="Pour autoriser l'agent, connectez-vous dans un autre onglet avec le lien reçu par e-mail, puis revenez ici et rechargez la page."
      >
        <Button variant="outline" className="flex-1" asChild>
          <a href="/login" target="_blank" rel="noreferrer">
            Se connecter
          </a>
        </Button>
        <Button className="flex-1" asChild>
          <a href={here}>Recharger</a>
        </Button>
      </Notice>
    )
  }

  const { session } = (await sessionResponse.json()) as { session: AppSession }
  let consent: OAuthConsentRequest

  try {
    consent = await api<OAuthConsentRequest>("/oauth/consent", {
      query: { request },
    })
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <Notice
          title="Demande expirée"
          description="La demande de connexion a expiré. Relancez-la depuis votre agent."
        />
      )
    }

    throw error
  }

  return (
    <AuthLayout>
      <OAuthConsentForm
        consent={consent}
        email={session.email}
        request={request}
      />
    </AuthLayout>
  )
}
