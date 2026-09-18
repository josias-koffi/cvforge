import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

import { UserDetailCards } from "@/components/admin/user-detail-cards"
import { UserQuickActions } from "@/components/admin/user-quick-actions"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import type { AdminUserDetail } from "@/lib/admin"
import { requireAdminSession } from "@/lib/session"

export const metadata: Metadata = { title: "Fiche utilisateur" }

export default async function AdminUserDetailPage(
  props: PageProps<"/admin/users/[email]">
) {
  const session = await requireAdminSession()
  const { email } = await props.params
  const detail = await api<AdminUserDetail>(
    `/admin/users/${encodeURIComponent(email)}`
  )

  return (
    <>
      <PageHeader
        title={detail.account.email}
        description="Profil, candidatures, crédits, statut du compte et actions rapides."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/admin/users">
                <ArrowLeftIcon />
                Tous les utilisateurs
              </Link>
            </Button>
            <UserQuickActions
              detail={detail}
              isSelf={detail.account.email === session.email}
            />
          </>
        }
      />
      <UserDetailCards detail={detail} />
    </>
  )
}
