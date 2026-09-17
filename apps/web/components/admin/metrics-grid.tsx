import { MetricCard } from "@/components/admin/metric-card"
import { OpenRouterBalanceCard } from "@/components/admin/openrouter-balance-card"
import { formatPrice } from "@/lib/format"
import {
  formatRatio,
  formatUsd,
  type AdminMetrics,
  type OpenRouterBalanceResponse,
} from "@/lib/metrics"

function countOf(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value)
}

export function MetricsGrid({
  balance,
  metrics,
}: {
  balance: OpenRouterBalanceResponse
  metrics: AdminMetrics
}) {
  const { apiCost, credits, documents, interviews, margin, revenue, users } = metrics

  return (
    <div className="grid gap-4 px-4 lg:px-6 @3xl/main:grid-cols-2 @6xl/main:grid-cols-3">
      <MetricCard
        label="Documents générés"
        value={countOf(documents.generatedCvCount + documents.generatedLetterCount)}
        breakdown={[
          { label: "CV", value: countOf(documents.generatedCvCount) },
          { label: "Lettres", value: countOf(documents.generatedLetterCount) },
          { label: "CV importés", value: countOf(documents.cvImportCount) },
          { label: "Offres analysées", value: countOf(documents.offerEnrichmentCount) },
        ]}
      />
      <MetricCard
        label="Entretiens"
        value={countOf(interviews.totalCount)}
        breakdown={[
          { label: "Terminés", value: countOf(interviews.completedCount) },
          {
            label: "En cours ou abandonnés",
            value: countOf(interviews.totalCount - interviews.completedCount),
          },
        ]}
      />
      <MetricCard
        label={`Utilisateurs actifs (${metrics.activeWindowDays} j)`}
        value={countOf(users.activeCount)}
        breakdown={[
          { label: "Comptes", value: countOf(users.totalCount) },
          { label: "Administrateurs", value: countOf(users.adminCount) },
          { label: "Candidatures", value: countOf(metrics.applications.totalCount) },
        ]}
        hint="Un compte est actif s'il a créé une candidature ou consommé des crédits sur la période."
      />
      <MetricCard
        label="Crédits vendus vs consommés"
        value={`${countOf(credits.sold)} / ${countOf(credits.consumed)}`}
        breakdown={[
          { label: "Vendus", value: countOf(credits.sold) },
          { label: "Offerts", value: countOf(credits.granted) },
          { label: "Consommés", value: countOf(credits.consumed) },
        ]}
      />
      <MetricCard
        label="Chiffre d'affaires Stripe"
        value={formatPrice(revenue.grossCents)}
        breakdown={[
          { label: "Commandes payées", value: countOf(revenue.paidOrderCount) },
          {
            label: "Panier moyen",
            value:
              revenue.paidOrderCount > 0
                ? formatPrice(Math.round(revenue.grossCents / revenue.paidOrderCount))
                : "—",
          },
        ]}
        hint="Montant brut encaissé, avant frais Stripe, remboursements et taxes."
      />
      <MetricCard
        label="Coût API et marge nette"
        value={margin ? formatPrice(margin.netEurCents) : "—"}
        breakdown={
          apiCost
            ? [
                { label: "Coût API estimé", value: formatPrice(apiCost.estimatedEurCents) },
                { label: "Usage OpenRouter", value: formatUsd(apiCost.usedUsd) },
                {
                  label: "Taux de marge",
                  value: margin?.ratio === null ? "—" : formatRatio(margin?.ratio ?? 0),
                },
              ]
            : undefined
        }
        hint={
          apiCost
            ? `Estimation : usage OpenRouter cumulé depuis l'ouverture du compte, converti à un taux fixe de ${apiCost.usdToEurRate} USD→EUR.${apiCost.stale ? " Dernière lecture du solde en échec, valeur possiblement périmée." : ""}`
            : "Indisponible : la supervision du solde OpenRouter n'est pas configurée."
        }
      />
      <OpenRouterBalanceCard data={balance} />
    </div>
  )
}
