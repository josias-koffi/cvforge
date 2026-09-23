import type { Metadata } from "next"

import { BoardsTable } from "@/components/admin/job-search/boards-table"
import { RunsPanel } from "@/components/admin/job-search/runs-panel"
import { SourcesTable } from "@/components/admin/job-search/sources-table"
import { JobSearchTabs } from "@/components/admin/job-search/job-search-tabs"
import { MergesTable } from "@/components/admin/job-search/merges-table"
import { PageHeader } from "@/components/layout/page-header"
import { api } from "@/lib/api"
import type {
  BoardProvider,
  DigestRun,
  FuzzyMerge,
  JobSourceState,
  RegisteredBoard,
} from "@/lib/job-boards"
import { requireAdminSession } from "@/lib/session"

export const metadata: Metadata = { title: "Collecte d'offres" }

/**
 * Where the offer collection is watched and overruled.
 *
 * Everything here used to need a shell in the container: seeing the registry,
 * launching a collection, cutting a source off.
 */
export default async function AdminJobSearchPage(
  props: PageProps<"/admin/job-search">
) {
  await requireAdminSession()

  const params = await props.searchParams
  const provider = typeof params.provider === "string" ? params.provider : ""
  const [{ boards, supportedProviders }, { merges }, { runs }, { sources }] =
    await Promise.all([
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
      api<{ sources: JobSourceState[] }>("/admin/job-search/sources"),
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
          sources={<SourcesTable sources={sources} />}
        />
      </div>
    </>
  )
}
