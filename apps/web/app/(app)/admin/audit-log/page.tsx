import type { Metadata } from "next"

import { AuditLogTable } from "@/components/admin/audit-log-table"
import { PageHeader } from "@/components/layout/page-header"
import { api } from "@/lib/api"
import type { AdminAuditPage } from "@/lib/admin"
import { requireAdminSession } from "@/lib/session"

export const metadata: Metadata = { title: "Journal d'audit" }

const PAGE_SIZE = 25

export default async function AdminAuditLogPage(
  props: PageProps<"/admin/audit-log">
) {
  await requireAdminSession()

  const { action, page, targetEmail } = await props.searchParams
  const data = await api<AdminAuditPage>("/admin/audit-log", {
    query: {
      action: typeof action === "string" ? action : undefined,
      page: typeof page === "string" ? page : undefined,
      pageSize: PAGE_SIZE,
      targetEmail: typeof targetEmail === "string" ? targetEmail : undefined,
    },
  })

  return (
    <>
      <PageHeader
        title="Journal d'audit"
        description="Qui a fait quoi, quand et sur quel compte. Les entrées ne sont jamais modifiées ni supprimées."
      />
      <div className="px-4 lg:px-6">
        <AuditLogTable
          key={`${data.filters.action ?? "all"}-${data.filters.targetEmail ?? "all"}`}
          data={data}
        />
      </div>
    </>
  )
}
