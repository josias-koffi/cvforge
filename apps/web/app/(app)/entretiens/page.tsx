import type { InterviewSessionListItem } from "@cvforge/types"
import type { Metadata } from "next"
import Link from "next/link"
import { ChartLineIcon, MicIcon } from "lucide-react"

import { SessionsTable } from "@/components/interview/sessions-table"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"

export const metadata: Metadata = { title: "Entretiens" }

export default async function InterviewsPage() {
  const { sessions } = await api<{ sessions: InterviewSessionListItem[] }>(
    "/interviews/sessions"
  )

  return (
    <>
      <PageHeader
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/entretiens/progression">
                <ChartLineIcon />
                Ma progression
              </Link>
            </Button>
            <Button asChild>
              <Link href="/entretiens/new">
                <MicIcon />
                Nouvel entretien
              </Link>
            </Button>
          </div>
        }
        description="Chaque session passée, avec son score et ce qu'elle a révélé."
        title="Entretiens"
      />
      <div className="px-4 lg:px-6">
        <SessionsTable sessions={sessions} />
      </div>
    </>
  )
}
