import type { AdminLegalDocument } from "@cvforge/types"
import type { Metadata } from "next"

import { LegalDocumentsEditor } from "@/components/admin/legal-documents-editor"
import { PageHeader } from "@/components/layout/page-header"
import { api } from "@/lib/api"
import { requireAdminSession } from "@/lib/session"

export const metadata: Metadata = { title: "Documents légaux" }

export default async function AdminLegalPage() {
  await requireAdminSession()
  const { documents } = await api<{ documents: AdminLegalDocument[] }>("/admin/legal")

  return (
    <>
      <PageHeader
        title="Documents légaux"
        description="CGU, CGV, mentions légales et confidentialité, dans les deux langues. Un document n'est en ligne qu'une fois publié."
      />
      <div className="px-4 lg:px-6">
        <LegalDocumentsEditor documents={documents} />
      </div>
    </>
  )
}
