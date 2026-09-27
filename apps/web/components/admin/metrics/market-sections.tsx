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
