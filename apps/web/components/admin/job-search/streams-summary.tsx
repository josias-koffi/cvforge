import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { formatDateTime } from "@/lib/format"
import { PROVIDER_LABELS, type BoardProvider, type StreamReports } from "@/lib/job-boards"

/**
 * What the continuous collection did last (ADR-027): the France Travail flow
 * and the half-hourly pass over company boards. A pass that had to leave
 * companies to the daily rhythm, or that was refused by a site, says so.
 */
export function StreamsSummary({ streams }: { streams: StreamReports }) {
  const franceTravail = streams.france_travail
  const boards = streams.boards_frequent
  const overflow = Object.entries(boards?.overflow ?? {})

  return (
    <div className="flex flex-col gap-3 text-sm">
      <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-[auto_1fr]">
        <dt className="text-muted-foreground">Flux France Travail</dt>
        <dd>
          {franceTravail?.at
            ? `${formatDateTime(franceTravail.at)} · ${franceTravail.listings ?? 0} offres · ${franceTravail.status}`
            : "pas encore lancé"}
        </dd>
        <dt className="text-muted-foreground">Sites carrière (30 min)</dt>
        <dd>
          {boards?.at
            ? `${formatDateTime(boards.at)} · ${boards.boardsRead ?? 0}/${boards.boardsSelected ?? 0} entreprises lues · ${boards.newListings ?? 0} nouvelles offres`
            : "pas encore lancé"}
        </dd>
      </dl>

      {overflow.length > 0 ? (
        <Alert variant="warning">
          <AlertTitle>Budget de la passe fréquente dépassé</AlertTitle>
          <AlertDescription>
            {overflow
              .map(
                ([provider, count]) =>
                  `${PROVIDER_LABELS[provider as BoardProvider] ?? provider} : ${count} entreprise${count > 1 ? "s" : ""}`
              )
              .join(" · ")}{" "}
            repassent au rythme quotidien (ADR-027, 15 minutes par cycle au plus).
          </AlertDescription>
        </Alert>
      ) : null}

      {boards?.paused?.length ? (
        <p className="text-xs text-muted-foreground">
          Repassés au quotidien pour 24 h (429 ou 403) : {boards.paused.join(", ")}
        </p>
      ) : null}
    </div>
  )
}
