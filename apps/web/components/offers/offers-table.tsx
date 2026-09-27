"use client"

import * as React from "react"
import Link from "next/link"
import { applicationStatuses, type DraftApplication } from "@cvforge/types"
import {
  ArrowUpDownIcon,
  CheckIcon,
  EllipsisVerticalIcon,
  FileTextIcon,
  MailIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  ZapIcon,
} from "lucide-react"

import {
  createDataTableColumnHelper,
  DataTable,
} from "@/components/data-table/data-table"
import { StatusBadge } from "@/components/offers/status-badge"
import { AtsScoreBadge } from "@/components/applications/ats-score-badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatDate, statusLabels } from "@/lib/format"

const columnHelper = createDataTableColumnHelper<DraftApplication>()

function DocumentFlag({ done, label }: { done: boolean; label: string }) {
  return (
    <span
      className={
        done
          ? "inline-flex items-center gap-1 text-foreground"
          : "inline-flex items-center gap-1 text-muted-foreground/60"
      }
    >
      {done ? <CheckIcon className="size-3.5" /> : null}
      {label}
    </span>
  )
}

function buildColumns(onToggleSort: () => void) {
  return columnHelper.columns([
    columnHelper.display({
      id: "offer",
      header: "Candidature",
      cell: ({ row }) => (
        <Link href={`/candidatures/${row.original.id}`} className="group block min-w-48">
          <span className="font-medium group-hover:underline">
            {row.original.extracted.title}
          </span>
          <span className="block text-xs text-muted-foreground">
            {[row.original.extracted.companyName, row.original.extracted.location]
              .filter(Boolean)
              .join(" · ") || "Entreprise non renseignée"}
          </span>
        </Link>
      ),
    }),
    columnHelper.display({
      id: "status",
      header: "Statut",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    }),
    columnHelper.display({
      id: "documents",
      header: "Documents",
      cell: ({ row }) => (
        <div className="flex gap-3 text-xs">
          <DocumentFlag done={Boolean(row.original.cvGeneratedAt)} label="CV" />
          <DocumentFlag
            done={Boolean(row.original.letterGeneratedAt)}
            label="Lettre"
          />
        </div>
      ),
    }),
    columnHelper.display({
      id: "atsScore",
      header: "Score ATS",
      // Renders nothing when the CV has never been scored: an empty cell says
      // "not measured", a zero would say "terrible". A score opens its
      // analysis in the CV editor (US-153).
      cell: ({ row }) =>
        row.original.atsScore ? (
          <Link
            href={`/candidatures/${row.original.id}/cv?analyse=ats`}
            className="inline-flex rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            title="Voir l'analyse ATS du CV"
          >
            <AtsScoreBadge score={row.original.atsScore} />
          </Link>
        ) : null,
    }),
    columnHelper.display({
      id: "createdAt",
      header: () => (
        <Button variant="ghost" size="sm" className="-ml-2" onClick={onToggleSort}>
          Ajoutée le
          <ArrowUpDownIcon />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground tabular-nums">
          {formatDate(row.original.createdAt)}
        </span>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => <OfferRowActions offer={row.original} />,
    }),
  ])
}

function OfferRowActions({ offer }: { offer: DraftApplication }) {
  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8">
            <EllipsisVerticalIcon />
            <span className="sr-only">Actions pour {offer.extracted.title}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem asChild>
            <Link href={`/candidatures/${offer.id}`}>Voir le détail</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/candidatures/${offer.id}/edit`}>
              <PencilIcon />
              Modifier la candidature
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={`/candidatures/${offer.id}/cv`}>
              <FileTextIcon />
              CV
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/candidatures/${offer.id}/letter`}>
              <MailIcon />
              Lettre
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

type OffersTableProps = {
  offers: DraftApplication[]
  pageSize?: number
  showToolbar?: boolean
}

export function OffersTable({
  offers,
  pageSize = 10,
  showToolbar = true,
}: OffersTableProps) {
  const [query, setQuery] = React.useState("")
  const [status, setStatus] = React.useState("all")
  const [newestFirst, setNewestFirst] = React.useState(true)
  const columns = React.useMemo(
    () => buildColumns(() => setNewestFirst((value) => !value)),
    []
  )
  const rows = React.useMemo(() => {
    const needle = query.trim().toLowerCase()

    return offers
      .filter((offer) => status === "all" || offer.status === status)
      .filter((offer) =>
        needle
          ? [offer.extracted.title, offer.extracted.companyName, offer.extracted.location]
              .filter(Boolean)
              .some((value) => value!.toLowerCase().includes(needle))
          : true
      )
      .sort((left, right) =>
        newestFirst
          ? right.createdAt.localeCompare(left.createdAt)
          : left.createdAt.localeCompare(right.createdAt)
      )
  }, [offers, query, status, newestFirst])

  const toolbar = showToolbar ? (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative w-full sm:max-w-xs">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Rechercher une candidature"
          placeholder="Poste, entreprise, lieu…"
          className="pl-8"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-full sm:w-44" aria-label="Filtrer par statut">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les statuts</SelectItem>
          {applicationStatuses.map((value) => (
            <SelectItem key={value} value={value}>
              {statusLabels[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  ) : null

  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(offer) => offer.id}
      pageSize={pageSize}
      toolbar={toolbar}
      emptyMessage={
        offers.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary motion-safe:animate-float">
              <ZapIcon className="size-5" strokeWidth={1.75} />
            </span>
            <span className="font-medium text-foreground">Pas encore de candidature</span>
            <span>Importez-en une pour lancer votre première étincelle.</span>
            <Button asChild size="sm">
              <Link href="/candidatures/new">
                <PlusIcon />
                Créer ma première candidature
              </Link>
            </Button>
          </div>
        ) : (
          "Aucune candidature ne correspond à ces filtres."
        )
      }
    />
  )
}
