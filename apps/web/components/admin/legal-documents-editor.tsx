"use client"

import type { AdminLegalDocument, LegalDocumentSlug } from "@cvforge/types"
import { useState } from "react"
import { SaveIcon, SendIcon } from "lucide-react"

import {
  publishLegalDocument,
  saveLegalDocument,
} from "@/app/(app)/admin/legal/actions"
import {
  LegalDocumentForm,
  type LegalFormValues,
} from "@/components/admin/legal-document-form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useActionMutation } from "@/hooks/use-action-mutation"

const DOCUMENT_LABELS: Record<LegalDocumentSlug, string> = {
  terms: "CGU",
  "sales-terms": "CGV",
  "legal-notice": "Mentions légales",
  privacy: "Confidentialité",
}

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeStyle: "short",
})

export function LegalDocumentsEditor({
  documents,
}: {
  documents: AdminLegalDocument[]
}) {
  const [first] = documents

  if (!first) {
    return (
      <p className="text-muted-foreground">
        Aucun document légal en base. Vérifiez que les migrations ont été appliquées.
      </p>
    )
  }

  return (
    <Tabs defaultValue={first.slug}>
      <TabsList>
        {documents.map((document) => (
          <TabsTrigger key={document.slug} value={document.slug}>
            {DOCUMENT_LABELS[document.slug]}
          </TabsTrigger>
        ))}
      </TabsList>
      {documents.map((document) => (
        <TabsContent key={document.slug} value={document.slug} className="mt-4">
          <DocumentCard document={document} />
        </TabsContent>
      ))}
    </Tabs>
  )
}

function DocumentCard({ document }: { document: AdminLegalDocument }) {
  const [values, setValues] = useState<LegalFormValues>({
    body: document.body,
    title: document.title,
  })
  const { pending, run } = useActionMutation(() => {})

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle>{DOCUMENT_LABELS[document.slug]}</CardTitle>
          {document.publishedAt ? (
            <Badge variant="success">Version {document.version}</Badge>
          ) : (
            <Badge variant="outline">Jamais publié</Badge>
          )}
        </div>
        <CardDescription>
          {document.publishedAt
            ? `En ligne depuis le ${dateFormat.format(new Date(document.publishedAt))}.`
            : "Ce document n'est pas servi au public tant qu'il n'a pas été publié."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <LegalDocumentForm values={values} onChange={setValues} />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => run(() => saveLegalDocument(document.slug, values))}
          >
            {pending ? <Spinner /> : <SaveIcon />}
            Enregistrer le brouillon
          </Button>
          <Button
            disabled={pending}
            onClick={() => run(() => publishLegalDocument(document.slug))}
          >
            {pending ? <Spinner /> : <SendIcon />}
            Publier
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
