"use client"

import {
  parseLegalBody,
  parseLegalInline,
  type LegalInline,
  type LocalizedText,
} from "@cvforge/types"

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
  "Markdown : « ## » un titre, « ### » un sous-titre, « - » ou « 1. » une liste, « > » une citation, [texte](https://…) un lien, **gras**, *italique*. Les adresses web et e-mail deviennent des liens. Une ligne vide sépare deux blocs ; le HTML n'est jamais interprété."

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

/** Links, bold and italics, as the public site renders them. */
function PreviewInline({ nodes }: { nodes: LegalInline[] }) {
  return nodes.map((node, index) => {
    if (node.type === "text") return node.text
    if (node.type === "strong") {
      return (
        <strong key={index} className="font-semibold text-foreground">
          <PreviewInline nodes={node.children} />
        </strong>
      )
    }
    if (node.type === "emphasis") {
      return (
        <em key={index}>
          <PreviewInline nodes={node.children} />
        </em>
      )
    }

    return (
      <a
        key={index}
        href={node.href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-foreground underline underline-offset-4"
      >
        <PreviewInline nodes={node.children} />
      </a>
    )
  })
}

function Inline({ text }: { text: string }) {
  return <PreviewInline nodes={parseLegalInline(text)} />
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
          return block.level === 3 ? (
            <h4 key={index} className="text-sm font-medium">
              <Inline text={block.text} />
            </h4>
          ) : (
            <h3 key={index} className="mt-2 font-medium">
              <Inline text={block.text} />
            </h3>
          )
        }

        if (block.type === "list") {
          const List = block.ordered ? "ol" : "ul"

          return (
            <List
              key={index}
              className={`pl-5 text-sm text-muted-foreground ${block.ordered ? "list-decimal" : "list-disc"}`}
            >
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  <Inline text={item} />
                </li>
              ))}
            </List>
          )
        }

        if (block.type === "quote") {
          return (
            <blockquote
              key={index}
              className="border-l-2 pl-3 text-sm text-muted-foreground italic"
            >
              <Inline text={block.text} />
            </blockquote>
          )
        }

        if (block.type === "rule") return <hr key={index} />

        return (
          <p key={index} className="text-sm text-muted-foreground">
            <Inline text={block.text} />
          </p>
        )
      })}
    </div>
  )
}
