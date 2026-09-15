"use client"

import { useActionState } from "react"
import Link from "next/link"
import type { DraftApplication } from "@cvforge/types"
import { AlertCircleIcon, SparklesIcon } from "lucide-react"

import { reExtractOffer, updateOffer } from "@/app/(app)/offers/actions"
import { ActionButton } from "@/components/feedback/action-button"
import { SubmitButton } from "@/components/feedback/submit-button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

type EditOfferFormProps = {
  offer: DraftApplication
  offerText: string
}

function TextField({
  defaultValue,
  label,
  name,
  ...props
}: React.ComponentProps<typeof Input> & { label: string; name: string }) {
  return (
    <Field>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input id={name} name={name} defaultValue={defaultValue ?? ""} {...props} />
    </Field>
  )
}

export function EditOfferForm({ offer, offerText }: EditOfferFormProps) {
  const [state, formAction] = useActionState(updateOffer.bind(null, offer.id), null)
  const { extracted } = offer

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state?.message ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-4 @5xl/main:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Source de l&apos;offre</CardTitle>
            <CardDescription>
              Le lien et le descriptif d&apos;origine servent de base à l&apos;IA.
            </CardDescription>
            <CardAction className="flex gap-2">
              <ActionButton
                type="button"
                size="sm"
                variant="outline"
                pendingLabel="Analyse…"
                disabled={!offer.offerUrl}
                action={() => reExtractOffer(offer.id, "url")}
              >
                <SparklesIcon />
                Depuis le lien
              </ActionButton>
              <ActionButton
                type="button"
                size="sm"
                variant="outline"
                pendingLabel="Analyse…"
                action={() => reExtractOffer(offer.id, "text")}
              >
                <SparklesIcon />
                Depuis le texte
              </ActionButton>
            </CardAction>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="offerUrl">Lien source</FieldLabel>
                <Input
                  id="offerUrl"
                  name="offerUrl"
                  type="url"
                  placeholder="https://…"
                  defaultValue={offer.offerUrl ?? ""}
                />
                <FieldDescription>
                  Laissez vide si l&apos;offre a été collée manuellement.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="offerText">Descriptif complet</FieldLabel>
                <Textarea
                  id="offerText"
                  name="offerText"
                  rows={18}
                  defaultValue={offerText}
                  required
                />
                <FieldDescription>
                  Enregistrez d&apos;abord vos modifications, puis relancez
                  l&apos;analyse IA pour mettre à jour les champs (1 crédit).
                </FieldDescription>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Informations extraites</CardTitle>
            <CardDescription>Corrigez ce que l&apos;IA a compris de l&apos;offre.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <TextField label="Intitulé du poste" name="title" defaultValue={extracted.title} required />
              <div className="grid gap-4 @3xl/main:grid-cols-2">
                <TextField label="Entreprise" name="companyName" defaultValue={extracted.companyName ?? ""} />
                <TextField label="Lieu" name="location" defaultValue={extracted.location ?? ""} />
                <TextField label="Contrat" name="contractType" defaultValue={extracted.contractType ?? ""} />
                <TextField label="Salaire" name="salaryRange" defaultValue={extracted.salaryRange ?? ""} />
              </div>
              <Field>
                <FieldLabel htmlFor="language">Langue de l&apos;offre</FieldLabel>
                <Select name="language" defaultValue={extracted.language}>
                  <SelectTrigger id="language" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="en">Anglais</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="summary">Résumé</FieldLabel>
                <Textarea id="summary" name="summary" rows={4} defaultValue={extracted.summary} />
              </Field>
              <Field>
                <FieldLabel htmlFor="responsibilities">Missions</FieldLabel>
                <Textarea
                  id="responsibilities"
                  name="responsibilities"
                  rows={5}
                  defaultValue={extracted.responsibilities.join("\n")}
                />
                <FieldDescription>Une mission par ligne.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="requirements">Profil recherché</FieldLabel>
                <Textarea
                  id="requirements"
                  name="requirements"
                  rows={5}
                  defaultValue={extracted.requirements.join("\n")}
                />
                <FieldDescription>Une compétence par ligne.</FieldDescription>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>
      </div>
      <div className="flex justify-end gap-2">
        <Button asChild variant="outline">
          <Link href={`/offers/${offer.id}`}>Annuler</Link>
        </Button>
        <SubmitButton pendingLabel="Enregistrement…">Enregistrer</SubmitButton>
      </div>
    </form>
  )
}
