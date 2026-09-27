"use client"

import { useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { DownloadIcon, PlusIcon } from "lucide-react"

import {
  addBoard,
  importSeedBoards,
  setBoardEnabled,
} from "@/app/(app)/admin/job-search/actions"
import { TableFrame } from "@/components/data-table/table-frame"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useActionMutation } from "@/hooks/use-action-mutation"
import { formatDateTime } from "@/lib/format"
import {
  BOARD_PROVIDERS,
  ORIGIN_LABELS,
  PROVIDER_LABELS,
  type BoardProvider,
  type RegisteredBoard,
} from "@/lib/job-boards"

/**
 * The company registry.
 *
 * It fills itself — shipped list, France Travail original links, candidates'
 * imports, Common Crawl — so this screen exists to see what it collected and
 * to overrule it.
 */
export function BoardsTable({
  boards,
  provider,
  supportedProviders,
}: {
  boards: RegisteredBoard[]
  provider: string
  supportedProviders: BoardProvider[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [url, setUrl] = useState("")
  const [companyName, setCompanyName] = useState("")
  const { pending, run } = useActionMutation(() => {
    setUrl("")
    setCompanyName("")
  })

  const navigate = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "" || value === "all") params.delete(key)
      else params.set(key, value)
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (url.trim()) run(() => addBoard(url, companyName))
  }

  return (
    <div className="flex flex-col gap-4">
      <form className="flex flex-wrap items-end gap-2" onSubmit={submit}>
        <div className="flex min-w-72 flex-1 flex-col gap-2">
          <label className="text-sm font-medium" htmlFor="board-url">
            Ajouter une entreprise par l&apos;URL d&apos;une de ses offres
          </label>
          <Input
            id="board-url"
            placeholder="https://job-boards.greenhouse.io/doctolib/jobs/123"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
        </div>
        <div className="flex w-52 flex-col gap-2">
          <label className="text-sm font-medium" htmlFor="board-company">
            Nom (facultatif)
          </label>
          <Input
            id="board-company"
            placeholder="Doctolib"
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
          />
        </div>
        <Button type="submit" disabled={pending || !url.trim()}>
          {pending ? <Spinner /> : <PlusIcon />}
          Ajouter
        </Button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={provider || "all"}
          onValueChange={(value) => navigate({ provider: value })}
        >
          <SelectTrigger
            className="w-full sm:w-56"
            aria-label="Filtrer par logiciel"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les logiciels</SelectItem>
            {BOARD_PROVIDERS.map((entry) => (
              <SelectItem key={entry} value={entry}>
                {PROVIDER_LABELS[entry]}
                {supportedProviders.includes(entry) ? "" : " (pas encore lu)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <SeedButton />
        <span className="text-sm text-muted-foreground sm:ml-auto">
          {boards.length} entreprise{boards.length > 1 ? "s" : ""}
        </span>
      </div>

      <TableFrame>
        <TableHeader>
          <TableRow>
            <TableHead>Entreprise</TableHead>
            <TableHead>Logiciel</TableHead>
            <TableHead>Origine</TableHead>
            <TableHead className="text-right">Dernières offres</TableHead>
            <TableHead>Dernière lecture</TableHead>
            <TableHead>État</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {boards.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="h-24 text-center text-muted-foreground"
              >
                Aucune entreprise. Importez la liste de départ, ou ajoutez-en une
                par l&apos;URL d&apos;une de ses offres.
              </TableCell>
            </TableRow>
          ) : (
            boards.map((board) => (
              <BoardRow
                key={`${board.provider}/${board.boardToken}`}
                board={board}
                collected={supportedProviders.includes(board.provider)}
              />
            ))
          )}
        </TableBody>
      </TableFrame>
    </div>
  )
}

/**
 * The companies shipped with the code. Replaying the import is harmless: it
 * upserts, and never re-enables one an admin switched off.
 */
function SeedButton() {
  const { pending, run } = useActionMutation(() => {})

  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() => run(() => importSeedBoards())}
    >
      {pending ? <Spinner /> : <DownloadIcon />}
      Importer la liste de départ
    </Button>
  )
}

function BoardRow({
  board,
  collected,
}: {
  board: RegisteredBoard
  collected: boolean
}) {
  const { pending, run } = useActionMutation(() => {})

  return (
    <TableRow>
      <TableCell className="font-medium">
        {board.companyName || board.boardToken}
        <span className="block text-xs text-muted-foreground">
          {board.boardToken}
        </span>
      </TableCell>
      <TableCell>
        {PROVIDER_LABELS[board.provider]}
        {collected ? null : (
          // Registered on purpose although nothing reads it yet: the day its
          // adapter lands, the company is collected instead of being lost.
          <span className="block text-xs text-muted-foreground">
            adaptateur à venir
          </span>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {ORIGIN_LABELS[board.origin]}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {board.lastFetchedAt ? board.lastJobCount : "—"}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {board.lastFetchedAt ? formatDateTime(board.lastFetchedAt) : "jamais"}
        {board.lastStatus && board.lastStatus !== "ok" ? (
          <span className="block text-xs text-destructive">
            {board.lastStatus}
          </span>
        ) : null}
      </TableCell>
      <TableCell>
        {board.enabled ? (
          <Badge variant="secondary">Active</Badge>
        ) : (
          <Badge variant="outline">Désactivée</Badge>
        )}
        {board.consecutiveFailures > 0 ? (
          <span className="block text-xs text-muted-foreground">
            {board.consecutiveFailures} échec
            {board.consecutiveFailures > 1 ? "s" : ""} d&apos;affilée
          </span>
        ) : null}
      </TableCell>
      <TableCell className="text-right">
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() =>
            run(() =>
              setBoardEnabled(board.provider, board.boardToken, !board.enabled)
            )
          }
        >
          {pending ? <Spinner /> : null}
          {board.enabled ? "Désactiver" : "Réactiver"}
        </Button>
      </TableCell>
    </TableRow>
  )
}
