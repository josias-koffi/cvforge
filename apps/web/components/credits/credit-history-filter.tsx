import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  CREDIT_HISTORY_FILTERS,
  type CreditHistoryType,
} from "@/lib/credit-history"

/** Links rather than a client toggle: the filter lives in the URL and restarts at page 1. */
export function CreditHistoryFilter({
  active,
}: {
  active: CreditHistoryType | null
}) {
  return (
    <nav
      aria-label="Filtrer l'historique"
      className="flex w-fit gap-1 rounded-lg border bg-card p-1"
    >
      {CREDIT_HISTORY_FILTERS.map(({ label, type }) => (
        <Button
          key={label}
          asChild
          size="sm"
          variant={type === active ? "secondary" : "ghost"}
        >
          <Link
            href={
              type ? `/credits/historique?type=${type}` : "/credits/historique"
            }
            aria-current={type === active ? "page" : undefined}
          >
            {label}
          </Link>
        </Button>
      ))}
    </nav>
  )
}
