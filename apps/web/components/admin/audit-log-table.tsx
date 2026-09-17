"use client"

import { useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from "lucide-react"

import { PagerButton } from "@/components/data-table/data-table"
import { TableFrame } from "@/components/data-table/table-frame"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { auditActionLabels, type AdminAuditEntry, type AdminAuditPage } from "@/lib/admin"
import { formatDateTime } from "@/lib/format"

const destructiveActions = new Set(["account_deleted", "account_suspended"])

/** The note is free text, plus whatever the action itself carries. */
function detailOf(entry: AdminAuditEntry) {
  const parts: string[] = []

  if (entry.metadata.credits !== undefined) {
    parts.push(`${entry.metadata.credits} crédits`)
  }

  if (entry.metadata.previousRole) {
    parts.push(`ancien rôle : ${entry.metadata.previousRole}`)
  }

  if (entry.note) {
    parts.push(entry.note)
  }

  return parts.join(" · ") || "—"
}

export function AuditLogTable({ data }: { data: AdminAuditPage }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [target, setTarget] = useState(data.filters.targetEmail ?? "")
  const { page, totalItems, totalPages } = data.pagination

  const navigate = (changes: Record<string, string | number | null>) => {
    const params = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "" || value === "all") params.delete(key)
      else params.set(key, String(value))
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <form
          className="relative w-full sm:max-w-xs"
          onSubmit={(event) => {
            event.preventDefault()
            navigate({ page: null, targetEmail: target })
          }}
        >
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Filtrer par compte concerné"
            placeholder="Filtrer par compte concerné…"
            className="pl-8"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
          />
        </form>
        <Select
          value={data.filters.action ?? "all"}
          onValueChange={(action) => navigate({ action, page: null })}
        >
          <SelectTrigger className="w-full sm:w-56" aria-label="Filtrer par action">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les actions</SelectItem>
            {Object.entries(auditActionLabels).map(([action, label]) => (
              <SelectItem key={action} value={action}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground sm:ml-auto">
          {totalItems} entrée{totalItems > 1 ? "s" : ""}
        </span>
      </div>
      <TableFrame>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Par</TableHead>
            <TableHead>Sur</TableHead>
            <TableHead>Détail</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                Aucune action enregistrée.
              </TableCell>
            </TableRow>
          ) : (
            data.entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="text-muted-foreground tabular-nums">
                  {formatDateTime(entry.createdAt)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      destructiveActions.has(entry.action) ? "warning" : "outline"
                    }
                  >
                    {auditActionLabels[entry.action] ?? entry.action}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">{entry.actorEmail}</TableCell>
                <TableCell>{entry.targetEmail ?? "—"}</TableCell>
                <TableCell className="max-w-72 truncate text-muted-foreground">
                  {detailOf(entry)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </TableFrame>
      {totalPages > 1 ? (
        <div className="flex items-center justify-end gap-2 text-sm">
          <span className="mr-2 font-medium">
            Page {page} sur {totalPages}
          </span>
          <PagerButton
            label="Page précédente"
            disabled={page <= 1}
            onClick={() => navigate({ page: page - 1 })}
          >
            <ChevronLeftIcon />
          </PagerButton>
          <PagerButton
            label="Page suivante"
            disabled={page >= totalPages}
            onClick={() => navigate({ page: page + 1 })}
          >
            <ChevronRightIcon />
          </PagerButton>
        </div>
      ) : null}
    </div>
  )
}
