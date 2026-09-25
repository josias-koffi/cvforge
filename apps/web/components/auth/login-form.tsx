"use client"

import { useActionState } from "react"
import { WELCOME_APPLICATIONS } from "@cvforge/types"
import { MailIcon } from "lucide-react"

import { requestMagicLink } from "@/app/login/actions"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ConsentField } from "@/components/auth/consent-field"
import { formatApplications } from "@/lib/format"
import { Spinner } from "@/components/ui/spinner"

export function LoginForm({ notice }: { notice?: string }) {
  const [state, formAction, pending] = useActionState(requestMagicLink, null)
  const error = state?.message ?? notice

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Bienvenue sur CVSpark</CardTitle>
        <CardDescription>
          Recevez votre lien de connexion par e-mail. Pas de mot de passe à retenir.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">E-mail</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="vous@exemple.com"
                required
              />
            </Field>
            <ConsentField />
            {error ? <FieldError>{error}</FieldError> : null}
            <Field>
              <Button type="submit" disabled={pending}>
                {pending ? <Spinner /> : <MailIcon />}
                {pending ? "Envoi en cours…" : "Recevoir mon lien"}
              </Button>
              <FieldDescription className="text-center">
                Première visite ? Votre compte se crée à la connexion, avec{" "}
                {formatApplications(WELCOME_APPLICATIONS)}{" "}
                {WELCOME_APPLICATIONS > 1 ? "offertes" : "offerte"}.
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
