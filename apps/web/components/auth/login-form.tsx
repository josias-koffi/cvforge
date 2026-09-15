"use client"

import { useActionState } from "react"
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
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function LoginForm({ notice }: { notice?: string }) {
  const [state, formAction, pending] = useActionState(requestMagicLink, null)
  const error = state?.message ?? notice

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Connexion</CardTitle>
        <CardDescription>
          Recevez un lien de connexion par e-mail, sans mot de passe.
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
            <Field orientation="horizontal">
              <Checkbox id="consent" name="consent" required />
              <FieldLabel htmlFor="consent" className="font-normal">
                J&apos;accepte que mes données soient traitées pour générer mes
                candidatures.
              </FieldLabel>
            </Field>
            {error ? <FieldError>{error}</FieldError> : null}
            <Field>
              <Button type="submit" disabled={pending}>
                <MailIcon />
                {pending ? "Envoi en cours…" : "Recevoir mon lien"}
              </Button>
              <FieldDescription className="text-center">
                Nouveau ? Le compte est créé à la première connexion.
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
