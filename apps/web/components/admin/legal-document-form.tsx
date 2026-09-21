"use client"

import { parseLegalBody, type LocalizedText } from "@cvforge/types"

import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

export type LegalFormValues = { title: LocalizedText; body: LocalizedText }

const LOCALES = [
  { id: "fr", label: "Français" },
  { id: "en", label: "English" },
] as const

const CONVENTION =
  "« ## » ouvre un sous-titre, « - » un point de liste, une ligne vide sépare deux blocs. Le texte n'est jamais interprété comme du HTML."

export function LegalDocumentForm({
  values,
  onChange,
}: {
  values: LegalFormValues
  onChange: (values: LegalFormValues) => void
}) {
  const set = (locale: "fr" | "en", field: "title" | "body", text: string) =>
    onChange({ ...values, [field]: { ...values[field], [locale]: text } })

  return (
    <Tabs defaultValue="fr">
      <TabsList>
        {LOCALES.map((locale) => (
          <TabsTrigger key={locale.id} value={locale.id}>
            {locale.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {LOCALES.map((locale) => (
        <TabsContent key={locale.id} value={locale.id} className="mt-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`title-${locale.id}`}>Titre</FieldLabel>
              <Input
                id={`title-${locale.id}`}
                value={values.title[locale.id]}
                onChange={(event) => set(locale.id, "title", event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`body-${locale.id}`}>Contenu</FieldLabel>
              <Textarea
                id={`body-${locale.id}`}
                className="min-h-80 font-mono text-sm"
                value={values.body[locale.id]}
                onChange={(event) => set(locale.id, "body", event.target.value)}
              />
              <p className="text-sm text-muted-foreground">{CONVENTION}</p>
            </Field>
            <Field>
              <FieldLabel>Aperçu</FieldLabel>
              <LegalPreview body={values.body[locale.id]} />
            </Field>
          </FieldGroup>
        </TabsContent>
      ))}
    </Tabs>
  )
}

/** The same parser the public site uses, so the preview cannot drift from it. */
function LegalPreview({ body }: { body: string }) {
  const blocks = parseLegalBody(body)

  if (blocks.length === 0) {
    return <p className="text-sm text-muted-foreground">Rien à afficher.</p>
  }

  return (
    <div className="flex max-h-80 flex-col gap-3 overflow-y-auto rounded-md border p-4">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return (
            <h3 key={index} className="mt-2 font-medium">
              {block.text}
            </h3>
          )
        }

        if (block.type === "list") {
          return (
            <ul key={index} className="list-disc pl-5 text-sm text-muted-foreground">
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )
        }

        return (
          <p key={index} className="text-sm text-muted-foreground">
            {block.text}
          </p>
        )
      })}
    </div>
  )
}
