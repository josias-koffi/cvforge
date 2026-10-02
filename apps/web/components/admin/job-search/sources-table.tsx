"use client"

import { setSourceEnabled } from "@/app/(app)/admin/job-search/actions"
import { TableFrame } from "@/components/data-table/table-frame"
import { StreamsSummary } from "@/components/admin/job-search/streams-summary"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  PROVIDER_LABELS,
  type BoardProvider,
  type JobSourceState,
  type StreamReports,
} from "@/lib/job-boards"
import { SOURCE_LABELS } from "@/lib/job-labels"

/**
 * Where the offers come from, and whether each source is being asked.
 *
 * Three states, kept apart on purpose: a source can have no adapter yet, or
 * have one but no credentials, or be switched off on purpose. Showing them as
 * one "inactive" would hide which of the three needs doing something about.
 */
export function SourcesTable({
  sources,
  streams = {},
}: {
  sources: JobSourceState[]
  streams?: StreamReports
}) {
  const nearQuota = sources.filter((source) => source.quotaAlert)

  return (
    <div className="flex flex-col gap-4">
      {nearQuota.length > 0 ? <QuotaAlert sources={nearQuota} /> : null}
      <StreamsSummary streams={streams} />
      <p className="text-sm text-muted-foreground">
        L&apos;interrupteur coupe une source déjà configurée. Une source sans
        identifiants reste muette quoi qu&apos;il arrive : ce sont deux choses
        différentes.
      </p>

      <TableFrame>
        <TableHeader>
          <TableRow>
            <TableHead>Source</TableHead>
            <TableHead>État</TableHead>
            <TableHead className="text-right">Dernières offres</TableHead>
            <TableHead className="text-right">Appels du jour</TableHead>
            <TableHead>Dernier appel</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sources.map((source) => (
            <SourceRow key={source.source} source={source} />
          ))}
        </TableBody>
      </TableFrame>
    </div>
  )
}

function SourceRow({ source }: { source: JobSourceState }) {
  const { pending, run } = useActionMutation(() => {})
  const canBeAsked = source.implemented && source.available

  return (
    <TableRow>
      <TableCell className="font-medium">
        {/* The provider's own name here: "Site de l'entreprise" is what a
            candidate should read, not what an admin needs to act on. */}
        {PROVIDER_LABELS[source.source as BoardProvider] ??
          SOURCE_LABELS[source.source] ??
          source.source}
        <span className="block text-xs text-muted-foreground">
          {source.source}
        </span>
      </TableCell>
      <TableCell>
        <SourceBadge source={source} />
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {source.lastRunAt ? source.lastListingCount : "—"}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        <CallsCell source={source} />
      </TableCell>
      <TableCell className="text-muted-foreground">
        {source.lastRunAt ? formatDateTime(source.lastRunAt) : "jamais"}
        {source.lastStatus && source.lastStatus !== "ok" ? (
          <span className="block text-xs text-destructive">
            {source.lastStatus}
          </span>
        ) : null}
      </TableCell>
      <TableCell className="text-right">
        <Button
          size="sm"
          variant="ghost"
          // Nothing to switch on a source that cannot answer anyway.
          disabled={pending || (!canBeAsked && source.enabled)}
          onClick={() => run(() => setSourceEnabled(source.source, !source.enabled))}
        >
          {pending ? <Spinner /> : null}
          {source.enabled ? "Couper" : "Réactiver"}
        </Button>
      </TableCell>
    </TableRow>
  )
}

function SourceBadge({ source }: { source: JobSourceState }) {
  if (!source.enabled) return <Badge variant="outline">Coupée</Badge>
  if (!source.implemented) {
    return <Badge variant="outline">Pas encore écrite</Badge>
  }
  if (!source.available) {
    return <Badge variant="outline">Identifiants absents</Badge>
  }

  return <Badge variant="secondary">Active</Badge>
}

/**
 * Calls made today, and the month against the quota when one is known.
 * France Travail announces none today (ADR-027): the month alone is shown.
 */
function CallsCell({ source }: { source: JobSourceState }) {
  return (
    <>
      {source.callsToday.toLocaleString("fr-FR")}
      <span className="block text-xs text-muted-foreground">
        {source.callsThisMonth.toLocaleString("fr-FR")}
        {source.monthlyQuota
          ? ` / ${source.monthlyQuota.toLocaleString("fr-FR")}`
          : ""}{" "}
        ce mois-ci
      </span>
    </>
  )
}

/** 80 % of a monthly quota: past it, France Travail can throttle the collection. */
export function QuotaAlert({ sources }: { sources: JobSourceState[] }) {
  return (
    <Alert variant="warning">
      <AlertTitle>Quota mensuel bientôt atteint</AlertTitle>
      <AlertDescription>
        {sources
          .map(
            (source) =>
              `${SOURCE_LABELS[source.source] ?? source.source} : ${source.callsThisMonth.toLocaleString("fr-FR")} appels sur ${(source.monthlyQuota ?? 0).toLocaleString("fr-FR")}`
          )
          .join(" · ")}
        . Ralentir la collecte (JOB_STREAM_INTERVAL_MINUTES) ou demander un
        quota plus élevé.
      </AlertDescription>
    </Alert>
  )
}
