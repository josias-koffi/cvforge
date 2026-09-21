"use client"

import type { InterviewSessionListItem } from "@cvforge/types"
import Link from "next/link"
import * as React from "react"

import {
  createDataTableColumnHelper,
  DataTable,
} from "@/components/data-table/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/format"
import {
  profileLabels,
  scoreVerdict,
  sessionStatusLabels,
  sessionStatusVariants,
} from "@/lib/interview/labels"

const columnHelper = createDataTableColumnHelper<InterviewSessionListItem>()

/** Where a row leads: its report once finished, the live studio otherwise. */
function destination(session: InterviewSessionListItem) {
  return session.status === "completed"
    ? `/entretiens/${session.id}/rapport`
    : `/entretiens/${session.id}`
}

export function SessionsTable({
  sessions,
}: {
  sessions: InterviewSessionListItem[]
}) {
  const columns = React.useMemo(
    () => [
      columnHelper.display({
        id: "subject",
        header: "Entretien",
        cell: ({ row }) => (
          <Link className="group block min-w-48" href={destination(row.original)}>
            <span className="font-medium group-hover:underline">
              {row.original.applicationTitle ?? "Entraînement libre"}
            </span>
            <span className="block text-xs text-muted-foreground">
              {profileLabels[row.original.profile]} ·{" "}
              {row.original.responseCount} réponse
              {row.original.responseCount > 1 ? "s" : ""}
            </span>
          </Link>
        ),
      }),
      columnHelper.display({
        id: "status",
        header: "Statut",
        cell: ({ row }) => (
          <Badge variant={sessionStatusVariants[row.original.status]}>
            {sessionStatusLabels[row.original.status]}
          </Badge>
        ),
      }),
      columnHelper.display({
        id: "score",
        header: "Score",
        cell: ({ row }) =>
          row.original.overallScore === null ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <span className="tabular-nums">
              {row.original.overallScore}/10{" "}
              <span className="text-xs text-muted-foreground">
                {scoreVerdict(row.original.overallScore)}
              </span>
            </span>
          ),
      }),
      columnHelper.display({
        id: "createdAt",
        header: "Date",
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <Button asChild size="sm" variant="ghost">
            <Link href={destination(row.original)}>
              {row.original.status === "completed" ? "Voir le rapport" : "Reprendre"}
            </Link>
          </Button>
        ),
      }),
    ],
    []
  )

  return (
    <DataTable
      columns={columns}
      data={sessions}
      emptyMessage="Aucun entretien pour le moment."
      getRowId={(session) => session.id}
      pageSize={10}
    />
  )
}
