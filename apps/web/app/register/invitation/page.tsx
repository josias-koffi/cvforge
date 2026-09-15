import type { Metadata } from "next"

import { AuthLayout } from "@/components/auth/auth-layout"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { getServerApiUrl } from "@/lib/config"
import { formatDateTime } from "@/lib/format"

export const metadata: Metadata = { title: "Invitation" }

type InvitationPreview = {
  email: string
  expiresAt: string
  role: "admin" | "user"
}

async function readInvitation(token: string) {
  const response = await fetch(
    `${getServerApiUrl()}/auth/invitations/preview?token=${encodeURIComponent(token)}`,
    { cache: "no-store" }
  )

  return response.ok ? ((await response.json()) as InvitationPreview) : null
}

const errors: Record<string, string> = {
  consent_required: "Merci d'accepter le traitement de vos données.",
  consume_failed: "Cette invitation n'est plus valide.",
}

export default async function InvitationPage(
  props: PageProps<"/register/invitation">
) {
  const { error, token } = await props.searchParams
  const tokenValue = typeof token === "string" ? token : ""
  const invitation = tokenValue ? await readInvitation(tokenValue) : null
  const errorMessage = typeof error === "string" ? errors[error] : undefined

  return (
    <AuthLayout>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Rejoindre CVForge</CardTitle>
          <CardDescription>
            {invitation
              ? `Invitation pour ${invitation.email} (${invitation.role === "admin" ? "administrateur" : "utilisateur"}), valable jusqu'au ${formatDateTime(invitation.expiresAt)}.`
              : "Cette invitation est invalide ou a expiré."}
          </CardDescription>
        </CardHeader>
        {invitation ? (
          <CardContent>
            <form action="/register/invitation/accept" method="post">
              <input type="hidden" name="token" value={tokenValue} />
              <FieldGroup>
                <Field orientation="horizontal">
                  <Checkbox id="consent" name="consent" required />
                  <FieldLabel htmlFor="consent" className="font-normal">
                    J&apos;accepte que mes données soient traitées pour générer
                    mes candidatures.
                  </FieldLabel>
                </Field>
                {errorMessage ? <FieldError>{errorMessage}</FieldError> : null}
                <Button type="submit">Accepter l&apos;invitation</Button>
              </FieldGroup>
            </form>
          </CardContent>
        ) : null}
      </Card>
    </AuthLayout>
  )
}
