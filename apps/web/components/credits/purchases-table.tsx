import type { CreditOrder, CreditOrderStatus } from "@cvforge/types"

import { TableFrame } from "@/components/data-table/table-frame"
import { Badge } from "@/components/ui/badge"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDateTime, formatPrice } from "@/lib/format"

const statusLabels: Record<CreditOrderStatus, string> = {
  expired: "Abandonné",
  failed: "Échoué",
  paid: "Payé",
  pending: "En attente",
}

const statusVariants: Record<CreditOrderStatus, "success" | "warning" | "destructive" | "outline"> = {
  expired: "outline",
  failed: "destructive",
  paid: "success",
  pending: "warning",
}

export function PurchasesTable({ orders }: { orders: CreditOrder[] }) {
  return (
    <TableFrame>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Offre</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead className="text-right">Crédits</TableHead>
          <TableHead className="text-right">Montant TTC</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
              Aucun achat pour l&apos;instant.
            </TableCell>
          </TableRow>
        ) : (
          orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="text-muted-foreground tabular-nums">
                {formatDateTime(order.paidAt ?? order.createdAt)}
              </TableCell>
              <TableCell>{order.offerName.fr}</TableCell>
              <TableCell>
                <Badge variant={statusVariants[order.status]}>{statusLabels[order.status]}</Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">{order.credits}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatPrice(order.priceCents)}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </TableFrame>
  )
}
