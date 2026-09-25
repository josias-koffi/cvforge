import type { CreditLedgerEntry } from "@cvforge/types"

import { TableFrame } from "@/components/data-table/table-frame"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { creditActionLabels, creditEntryDetail } from "@/lib/credit-history"
import { formatDateTime } from "@/lib/format"

export function CreditHistoryTable({
  entries,
}: {
  entries: CreditLedgerEntry[]
}) {
  return (
    <TableFrame>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Opération</TableHead>
          <TableHead className="text-right">Crédits</TableHead>
          <TableHead className="text-right">Solde</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={4}
              className="h-20 text-center text-muted-foreground"
            >
              Aucune opération.
            </TableCell>
          </TableRow>
        ) : (
          entries.map((entry) => {
            const detail = creditEntryDetail(entry)

            return (
              <TableRow key={entry.id}>
                <TableCell className="text-muted-foreground tabular-nums">
                  {formatDateTime(entry.createdAt)}
                </TableCell>
                <TableCell className="max-w-80 truncate">
                  {creditActionLabels[entry.action] ?? entry.action}
                  {detail ? (
                    <span className="text-muted-foreground"> · {detail}</span>
                  ) : null}
                </TableCell>
                <TableCell
                  className={`text-right tabular-nums ${entry.amount > 0 ? "text-success" : ""}`}
                >
                  {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {entry.balanceAfter}
                </TableCell>
              </TableRow>
            )
          })
        )}
      </TableBody>
    </TableFrame>
  )
}
