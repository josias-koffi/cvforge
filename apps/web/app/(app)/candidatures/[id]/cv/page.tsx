import type { Metadata } from "next"
import type { CVDocumentContent, CVDocumentVersionEntry } from "@cvforge/types"

import { CvEditor } from "@/components/documents/cv-editor"
import { MissingDocument } from "@/components/documents/missing-document"
import { PageHeader } from "@/components/layout/page-header"
import { api, ApiError } from "@/lib/api"
import { latestAiVersionId } from "@/lib/document-versions"
import { loadOffer } from "@/lib/offers"

export const metadata: Metadata = { title: "CV" }

async function loadCv(offerId: string) {
  try {
    const [{ cvContent }, { versions }] = await Promise.all([
      api<{ cvContent: CVDocumentContent }>(`/applications/${offerId}/cv`),
      api<{ versions: CVDocumentVersionEntry[] }>(`/applications/${offerId}/cv/versions`),
    ])
    return { cvContent, versions }
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

export default async function CvPage(props: PageProps<"/candidatures/[id]/cv">) {
  const { id } = await props.params
  const { analyse } = await props.searchParams
  const [{ application }, cv] = await Promise.all([loadOffer(id), loadCv(id)])

  return (
    <>
      <PageHeader
        title="CV"
        description={`${application.extracted.title}${application.extracted.companyName ? ` · ${application.extracted.companyName}` : ""}`}
      />
      {cv?.cvContent ? (
        <CvEditor
          key={latestAiVersionId(cv.versions)}
          atsScore={application.atsScore}
          openAtsReport={analyse === "ats"}
          offerId={id}
          cvContent={cv.cvContent}
          versions={cv.versions}
        />
      ) : (
        <MissingDocument kind="cv" offerId={id} />
      )}
    </>
  )
}
