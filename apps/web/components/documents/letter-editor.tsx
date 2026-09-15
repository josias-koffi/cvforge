"use client"

import { useState } from "react"
import { renderLetterPdfHtml } from "@cvforge/document-renderer"
import type { LetterDocumentContent, LetterDocumentVersionEntry } from "@cvforge/types"
import { SparklesIcon } from "lucide-react"

import { saveLetter } from "@/app/(app)/offers/[id]/documents-actions"
import { generateDocument } from "@/app/(app)/offers/actions"
import { ActionButton } from "@/components/feedback/action-button"
import { EditorLayout } from "@/components/documents/editor-layout"
import { FieldGrid, SpecField, type FieldSpec } from "@/components/documents/list-editor"
import { useDocumentEditor } from "@/components/documents/use-document-editor"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"

type Candidate = LetterDocumentContent["candidate"]
type Body = LetterDocumentContent["body"]

const candidateFields: FieldSpec<Candidate>[] = [
  { key: "firstName", label: "Prénom" },
  { key: "lastName", label: "Nom" },
  { key: "email", label: "E-mail" },
  { key: "phone", label: "Téléphone" },
  { key: "city", label: "Ville" },
  { key: "linkedin", label: "LinkedIn" },
]

const bodyFields: FieldSpec<Body>[] = [
  { key: "paragraph1", label: "Introduction", type: "multiline" },
  { key: "paragraph2", label: "Parcours et compétences", type: "multiline" },
  { key: "paragraph3", label: "Motivation pour l'entreprise", type: "multiline" },
  { key: "paragraph4", label: "Conclusion", type: "multiline" },
]

function RegenerateDialog({ offerId }: { offerId: string }) {
  const [refinement, setRefinement] = useState("")

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <SparklesIcon />
          Régénérer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Régénérer la lettre</DialogTitle>
          <DialogDescription>
            Donnez une consigne à l&apos;IA. La lettre actuelle est conservée dans
            l&apos;historique des versions. Coût : 3 crédits.
          </DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor="refinement">Consigne (facultatif)</FieldLabel>
          <Textarea
            id="refinement"
            rows={4}
            placeholder="Plus concise, insister sur mon expérience en IA générative…"
            value={refinement}
            onChange={(event) => setRefinement(event.target.value)}
          />
          <FieldDescription>Laissez vide pour une nouvelle proposition.</FieldDescription>
        </Field>
        <DialogFooter>
          <ActionButton
            pendingLabel="L'IA rédige…"
            action={() => generateDocument(offerId, "letter", refinement.trim() || undefined)}
          >
            <SparklesIcon />
            Lancer la génération
          </ActionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function LetterEditor({
  letterContent,
  offerId,
  versions,
}: {
  letterContent: LetterDocumentContent
  offerId: string
  versions: LetterDocumentVersionEntry[]
}) {
  const editor = useDocumentEditor(letterContent, (content) => saveLetter(offerId, content))
  const { draft, setDraft } = editor

  return (
    <EditorLayout
      documentKind="letter"
      offerId={offerId}
      dirty={editor.dirty}
      saving={editor.saving}
      onSave={editor.save}
      onRestore={editor.restore}
      versions={versions}
      previewHtml={renderLetterPdfHtml(draft)}
      toolbar={<RegenerateDialog offerId={offerId} />}
    >
      <Card>
        <CardHeader>
          <CardTitle>En-tête</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FieldGrid>
            {candidateFields.map((spec) => (
              <SpecField
                key={spec.key}
                id="letter-candidate"
                spec={spec}
                value={draft.candidate[spec.key]}
                onChange={(value) =>
                  setDraft({ ...draft, candidate: { ...draft.candidate, [spec.key]: value } })
                }
              />
            ))}
            <SpecField
              id="letter-company"
              spec={{ key: "name", label: "Entreprise" }}
              value={draft.company.name}
              onChange={(value) =>
                setDraft({ ...draft, company: { ...draft.company, name: value as string } })
              }
            />
            <SpecField
              id="letter-company"
              spec={{ key: "city", label: "Ville de l'entreprise" }}
              value={draft.company.city}
              onChange={(value) =>
                setDraft({ ...draft, company: { ...draft.company, city: value as string } })
              }
            />
            <SpecField
              id="letter"
              spec={{ key: "date", label: "Date" }}
              value={draft.date}
              onChange={(value) => setDraft({ ...draft, date: value as string })}
            />
            <SpecField
              id="letter"
              spec={{ key: "object", label: "Objet" }}
              value={draft.object}
              onChange={(value) => setDraft({ ...draft, object: value as string })}
            />
          </FieldGrid>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Corps de la lettre</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {bodyFields.map((spec) => (
            <SpecField
              key={spec.key}
              id="letter-body"
              spec={spec}
              value={draft.body[spec.key] ?? ""}
              onChange={(value) =>
                setDraft({ ...draft, body: { ...draft.body, [spec.key]: value } })
              }
            />
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Signature</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGrid>
            <SpecField
              id="signature"
              spec={{ key: "firstName", label: "Prénom" }}
              value={draft.signature.firstName}
              onChange={(value) =>
                setDraft({ ...draft, signature: { ...draft.signature, firstName: value as string } })
              }
            />
            <SpecField
              id="signature"
              spec={{ key: "lastName", label: "Nom" }}
              value={draft.signature.lastName}
              onChange={(value) =>
                setDraft({ ...draft, signature: { ...draft.signature, lastName: value as string } })
              }
            />
          </FieldGrid>
        </CardContent>
      </Card>
    </EditorLayout>
  )
}
