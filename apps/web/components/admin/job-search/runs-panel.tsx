"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { PlayIcon } from "lucide-react"

import { startCollection } from "@/app/(app)/admin/job-search/actions"
import { TableFrame } from "@/components/data-table/table-frame"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  COLLECTION_WINDOWS,
  RUN_KIND_LABELS,
  RUN_STAT_LABELS,
  RUN_STATUS_LABELS,
  type DigestRun,
} from "@/lib/job-boards"

/** A collection takes minutes; the page checks back until it is over. */
const POLL_INTERVAL_MS = 5_000

const WINDOW_LABELS: Record<number, string> = {
  1: "Depuis hier",
  7: "Les 7 derniers jours",
  31: "Les 31 derniers jours (premier remplissage)",
}

/**
 * Starting a collection, and what the previous ones did.
 *
 * The button only collects: offers are stored and that is all. Selecting for
 * each candidate and sending the morning e-mail stays with the scheduled pass.
 */
export function RunsPanel({ runs }: { runs: DigestRun[] }) {
  const router = useRouter()
  const [sinceDays, setSinceDays] = useState("1")
  const { pending, run } = useActionMutation(() => {})
  const running = runs.some((entry) => entry.status === "running")

  useEffect(() => {
    if (!running) return

    const timer = setInterval(() => router.refresh(), POLL_INTERVAL_MS)

    return () => clearInterval(timer)
  }, [running, router])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex w-full flex-col gap-2 sm:w-80">
          <label className="text-sm font-medium" htmlFor="run-window">
            Fenêtre de publication
          </label>
          <Select value={sinceDays} onValueChange={setSinceDays}>
            <SelectTrigger id="run-window">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COLLECTION_WINDOWS.map((days) => (
                <SelectItem key={days} value={String(days)}>
                  {WINDOW_LABELS[days]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          disabled={pending || running}
          onClick={() => run(() => startCollection(Number(sinceDays)))}
        >
          {pending || running ? <Spinner /> : <PlayIcon />}
          {running ? "Collecte en cours…" : "Lancer une collecte"}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        La collecte récupère et enregistre les offres. Elle n&apos;envoie ni
        sélection ni e-mail : c&apos;est la passe de 6 h qui s&apos;en charge.
      </p>

      <TableFrame>
        <TableHeader>
          <TableRow>
            <TableHead>Démarrée</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>État</TableHead>
            <TableHead>Résultat</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="h-24 text-center text-muted-foreground"
              >
                Aucune collecte pour l&apos;instant.
              </TableCell>
            </TableRow>
          ) : (
            runs.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>
                  {formatDateTime(entry.startedAt)}
                  <span className="block text-xs text-muted-foreground">
                    journée du {entry.runDate}
                  </span>
                </TableCell>
                <TableCell>{RUN_KIND_LABELS[entry.kind]}</TableCell>
                <TableCell>
                  <Badge
                    variant={entry.status === "failed" ? "destructive" : "secondary"}
                  >
                    {RUN_STATUS_LABELS[entry.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <RunResult run={entry} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </TableFrame>
    </div>
  )
}

function RunResult({ run }: { run: DigestRun }) {
  if (run.status === "running") {
    return <span className="text-muted-foreground">en cours…</span>
  }

  const stats = run.stats ?? {}
  const figures = Object.entries(RUN_STAT_LABELS)
    .map(([key, label]) => [stats[key], label] as const)
    .filter(([value]) => typeof value === "number" && value > 0)
    .map(([value, label]) => `${value} ${label}`)
  const errors = Array.isArray(stats.errors) ? stats.errors : []

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm">
        {figures.length > 0 ? figures.join(" · ") : "rien de nouveau"}
      </span>
      {errors.length > 0 ? (
        // Shown in full: an error swallowed by the collection is exactly what
        // made the offer database look empty for no reason.
        <span className="text-xs text-destructive">{errors.join(" · ")}</span>
      ) : null}
    </div>
  )
}
