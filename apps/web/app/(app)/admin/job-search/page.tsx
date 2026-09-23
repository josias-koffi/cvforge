import type { Metadata } from "next"

import { BoardsTable } from "@/components/admin/job-search/boards-table"
import { RunsPanel } from "@/components/admin/job-search/runs-panel"
import { JobSearchTabs } from "@/components/admin/job-search/job-search-tabs"
import { MergesTable } from "@/components/admin/job-search/merges-table"
import { PageHeader } from "@/components/layout/page-header"
import { api } from "@/lib/api"
import type {
  BoardProvider,
  DigestRun,
  FuzzyMerge,
  RegisteredBoard,
} from "@/lib/job-boards"
import { requireAdminSession } from "@/lib/session"

export const metadata: Metadata = { title: "Collecte d'offres" }

/**
 * Where the offer collection is watched and overruled.
 *
 * Both tabs read endpoints that already existed and had no interface: seeing
 * the registry required a shell in the container.
 */
export default async function AdminJobSearchPage(
  props: PageProps<"/admin/job-search">
) {
  await requireAdminSession()

  const params = await props.searchParams
  const provider = typeof params.provider === "string" ? params.provider : ""
  const [{ boards, supportedProviders }, { merges }, { runs }] = await Promise.all([
    api<{ boards: RegisteredBoard[]; supportedProviders: BoardProvider[] }>(
      "/admin/job-boards",
      { query: { provider: provider || undefined } }
    ),
    api<{ merges: FuzzyMerge[] }>("/admin/job-boards/merges", {
      query: { limit: 50 },
    }),
    api<{ runs: DigestRun[] }>("/admin/job-search/runs", {
      query: { limit: 20 },
    }),
  ])

  return (
    <>
      <PageHeader
        title="Collecte d'offres"
        description="Les entreprises dont nous lisons la page carrière, et les rapprochements d'annonces qui demandent un avis."
      />
      <div className="px-4 lg:px-6">
        <JobSearchTabs
          boards={
            <BoardsTable
              boards={boards}
              provider={provider}
              supportedProviders={supportedProviders}
            />
          }
          merges={<MergesTable merges={merges} />}
          runs={<RunsPanel runs={runs} />}
        />
      </div>
    </>
  )
}
