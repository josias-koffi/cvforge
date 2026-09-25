import type { Metadata } from "next"
import type { CreditHistoryPage, CreditOrder } from "@cvforge/types"
import { ClockIcon } from "lucide-react"

import { CreditHistoryFilter } from "@/components/credits/credit-history-filter"
import { CreditHistoryTable } from "@/components/credits/credit-history-table"
import { PagePagination } from "@/components/data-table/page-pagination"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { api } from "@/lib/api"
import { parseCreditHistoryParams } from "@/lib/credit-history"
import { formatCredits } from "@/lib/format"

export const metadata: Metadata = { title: "Historique des crédits" }

/**
 * Where the credits went, a page at a time. A paid purchase is already a line
 * of the ledger; of the orders, only those still waiting for Stripe are shown,
 * since they are the ones not in the ledger yet.
 */
export default async function CreditHistoryRoute(
  props: PageProps<"/credits/historique">
) {
  const query = parseCreditHistoryParams(await props.searchParams)
  const [history, { orders }] = await Promise.all([
    api<CreditHistoryPage>("/credits/me/history", {
      query: { kind: query.kind ?? undefined, page: query.page },
    }),
    api<{ orders: CreditOrder[] }>("/billing/orders/me"),
  ])
  const pendingCredits = orders
    .filter((order) => order.status === "pending")
    .reduce((total, order) => total + order.credits, 0)

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      {pendingCredits > 0 ? (
        <Alert>
          <ClockIcon />
          <AlertTitle>Paiement en cours de confirmation</AlertTitle>
          <AlertDescription>
            {formatCredits(pendingCredits)} seront ajoutés dès que Stripe aura
            confirmé le paiement.
          </AlertDescription>
        </Alert>
      ) : null}
      <CreditHistoryFilter active={query.type} />
      <CreditHistoryTable entries={history.entries} />
      <PagePagination
        page={history.pagination.page}
        lastPage={history.pagination.totalPages}
        path="/credits/historique"
        params={{ type: query.type ?? undefined }}
      />
    </div>
  )
}
