"use client"

import { useActionState } from "react"
import { AlertCircleIcon, ClipboardPasteIcon, LinkIcon, ZapIcon } from "lucide-react"

import { importOffer } from "@/app/(app)/offers/actions"
import { SubmitButton } from "@/components/feedback/submit-button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { creditCostLabel } from "@/lib/format"

function SourceForm({
  children,
  source,
}: {
  children: React.ReactNode
  source: "url" | "text"
}) {
  const [state, formAction] = useActionState(importOffer, null)

  return (
    <form action={formAction}>
      <input type="hidden" name="source" value={source} />
      <Card>
        <CardHeader>
          <CardTitle>
            {source === "url" ? "Depuis le lien de l'annonce" : "Depuis le texte de l'annonce"}
          </CardTitle>
          <CardDescription>
            On en extrait le poste, l&apos;entreprise, les missions et le profil
            recherché en quelques secondes. Tout reste modifiable ensuite.{" "}
            {creditCostLabel("offer_enrichment")}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            {children}
            {state?.message ? (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            ) : null}
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end">
          <SubmitButton spark pendingLabel="Analyse en cours…">
            <ZapIcon />
            Analyser l&apos;offre
          </SubmitButton>
        </CardFooter>
      </Card>
    </form>
  )
}

export function ImportOfferForm() {
  return (
    <Tabs defaultValue="url" className="gap-4">
      <TabsList>
        <TabsTrigger value="url">
          <LinkIcon />
          Lien
        </TabsTrigger>
        <TabsTrigger value="text">
          <ClipboardPasteIcon />
          Texte
        </TabsTrigger>
      </TabsList>
      <TabsContent value="url">
        <SourceForm source="url">
          <Field>
            <FieldLabel htmlFor="offerUrl">Lien de l&apos;offre</FieldLabel>
            <Input
              id="offerUrl"
              name="offerUrl"
              type="url"
              placeholder="https://www.welcometothejungle.com/fr/companies/…"
              required
            />
            <FieldDescription>
              Fonctionne avec la plupart des sites d&apos;emploi publics. Si la page est
              protégée, utilisez l&apos;onglet Texte.
            </FieldDescription>
          </Field>
        </SourceForm>
      </TabsContent>
      <TabsContent value="text">
        <SourceForm source="text">
          <Field>
            <FieldLabel htmlFor="offerText">Descriptif de l&apos;offre</FieldLabel>
            <Textarea
              id="offerText"
              name="offerText"
              rows={14}
              minLength={160}
              placeholder="Collez ici le texte complet de l'annonce…"
              required
            />
            <FieldDescription>160 caractères minimum.</FieldDescription>
          </Field>
        </SourceForm>
      </TabsContent>
    </Tabs>
  )
}
