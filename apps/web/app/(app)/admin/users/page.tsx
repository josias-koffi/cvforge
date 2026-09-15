import type { Metadata } from "next"

import { InviteUserDialog } from "@/components/admin/user-dialogs"
import { UsersTable } from "@/components/admin/users-table"
import { PageHeader } from "@/components/layout/page-header"
import { api } from "@/lib/api"
import type { AdminUsersPage } from "@/lib/admin"
import { requireAdminSession } from "@/lib/session"

export const metadata: Metadata = { title: "Utilisateurs" }

const PAGE_SIZE = 20

export default async function AdminUsersPage(props: PageProps<"/admin/users">) {
  const session = await requireAdminSession()
  const { page, query, role } = await props.searchParams
  const data = await api<AdminUsersPage>("/admin/users", {
    query: {
      page: typeof page === "string" ? page : undefined,
      pageSize: PAGE_SIZE,
      query: typeof query === "string" ? query : undefined,
      role: typeof role === "string" ? role : undefined,
    },
  })

  return (
    <>
      <PageHeader
        title="Utilisateurs"
        description="Invitez, gérez les rôles et les crédits, supprimez des comptes."
        actions={<InviteUserDialog />}
      />
      <div className="px-4 lg:px-6">
        <UsersTable
          key={`${data.filters.query}-${data.filters.role}`}
          data={data}
          currentEmail={session.email}
        />
      </div>
    </>
  )
}
