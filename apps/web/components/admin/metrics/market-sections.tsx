import type { MarketMetrics } from "@cvforge/types"

import { FunnelSteps } from "@/components/admin/metrics/funnel-steps"
import { MetricsGrid } from "@/components/admin/metrics/metrics-section"
import { RankedListCard } from "@/components/admin/metrics/ranked-list-card"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatCount } from "@/lib/admin-metrics/format"
import { SOURCE_LABELS } from "@/lib/job-labels"
import { periodPhrases } from "@/lib/admin-metrics/period"

/**
 * "Marché": what candidates aim at — from their applications, their searches
 * and the free tools — and whether the morning offers get used.
 */
export function MarketSections({ data }: { data: MarketMetrics }) {
  const when = periodPhrases[data.window.period]

  return (
    <MetricsGrid className="@6xl/main:grid-cols-3">
      <DailyOffersCard offers={data.dailyOffers} when={when} />
      <AlertDelaysCard delays={data.alertDelays} when={when} />
      <RankedListCard
        description={`Les entreprises des offres visées, ${when}.`}
        items={data.topCompanies}
        title="Entreprises visées"
      />
      <RankedListCard
        description={`Les intitulés des offres visées, ${when}.`}
        items={data.topJobTitles}
        title="Postes visés"
      />
      <RankedListCard
        description="Les postes cibles des recherches configurées."
        items={data.topTargetRoles}
        title="Postes cibles des recherches"
      />
      <RankedListCard
        description={`Les candidatures envoyées, par entreprise, ${when}.`}
        items={data.topAppliedCompanies}
        title="Entreprises les plus postulées"
      />
      <RankedListCard
        description="Via l'outil gratuit « Vérifier un employeur », visiteurs compris."
        items={data.topCheckedCompanies}
        title="Entreprises vérifiées"
      />
      <RankedListCard
        description="Via l'outil gratuit « Ce métier recrute-t-il ? », avec le département."
        items={data.topSearchedJobs}
        title="Métiers recherchés"
      />
    </MetricsGrid>
  )
}

function DailyOffersCard({
  offers,
  when,
}: {
  offers: MarketMetrics["dailyOffers"]
  when: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Offres du jour</CardTitle>
        <CardDescription>
          Les offres du mail du matin, jusqu&apos;à la candidature, {when}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FunnelSteps
          steps={[
            { count: offers.proposed, label: "Proposées" },
            { count: offers.seen, label: "Vues" },
            { count: offers.saved, label: "Sauvegardées" },
            { count: offers.applied, label: "Postulées" },
          ]}
        />
        <p className="text-sm text-muted-foreground">
          Écartées par les candidats : {formatCount(offers.dismissed)}
        </p>
      </CardContent>
    </Card>
  )
}

/** Target set by the sprint goal (E27): a median under 10 minutes for France Travail. */
const MEDIAN_GOAL_MINUTES = 10

/** Publication at the source → alert raised, per source (US-165). */
function AlertDelaysCard({
  delays,
  when,
}: {
  delays: MarketMetrics["alertDelays"]
  when: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Délai publication → alerte</CardTitle>
        <CardDescription>
          Médiane et 90e centile par source, {when}. Objectif : médiane sous{" "}
          {MEDIAN_GOAL_MINUTES} minutes pour France Travail.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {delays.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune alerte sur la période.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="font-normal">Source</th>
                <th className="text-right font-normal">Alertes</th>
                <th className="text-right font-normal">Médiane</th>
                <th className="text-right font-normal">90e centile</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {delays.map((delay) => (
                <tr key={delay.source}>
                  <td>{SOURCE_LABELS[delay.source] ?? delay.source}</td>
                  <td className="text-right">{formatCount(delay.alerts)}</td>
                  <td
                    className={
                      delay.source === "france_travail" &&
                      delay.medianMinutes > MEDIAN_GOAL_MINUTES
                        ? "text-right text-destructive"
                        : "text-right"
                    }
                  >
                    {formatMinutes(delay.medianMinutes)}
                  </td>
                  <td className="text-right">
                    {formatMinutes(delay.p90Minutes)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  )
}

function formatMinutes(minutes: number): string {
  return minutes < 60
    ? `${minutes.toLocaleString("fr-FR")} min`
    : `${(minutes / 60).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} h`
}
