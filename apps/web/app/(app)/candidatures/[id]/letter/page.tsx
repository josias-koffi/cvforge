import type { Metadata } from "next"
import type { LetterDocumentContent, LetterDocumentVersionEntry } from "@cvforge/types"

import { LetterEditor } from "@/components/documents/letter-editor"
import { MissingDocument } from "@/components/documents/missing-document"
import { PageHeader } from "@/components/layout/page-header"
import { api, ApiError } from "@/lib/api"
import { loadOffer } from "@/lib/offers"

export const metadata: Metadata = { title: "Lettre de motivation" }

async function loadLetter(offerId: string) {
  try {
    const [{ letterContent }, { versions }] = await Promise.all([
      api<{ letterContent: LetterDocumentContent }>(`/applications/${offerId}/letter`),
      api<{ versions: LetterDocumentVersionEntry[] }>(`/applications/${offerId}/letter/versions`),
    ])
    return { letterContent, versions }
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

export default async function LetterPage(props: PageProps<"/candidatures/[id]/letter">) {
  const { id } = await props.params
  const [{ application }, letter] = await Promise.all([loadOffer(id), loadLetter(id)])

  return (
    <>
      <PageHeader
        title="Lettre de motivation"
        description={`${application.extracted.title}${application.extracted.companyName ? ` · ${application.extracted.companyName}` : ""}`}
      />
      {letter?.letterContent ? (
        <LetterEditor offerId={id} letterContent={letter.letterContent} versions={letter.versions} />
      ) : (
        <MissingDocument kind="letter" offerId={id} />
      )}
    </>
  )
}
