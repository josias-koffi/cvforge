import type { RevenueMetrics } from "@cvforge/types"
import {
  EuroIcon,
  ReceiptIcon,
  ShoppingBasketIcon,
  UserCheckIcon,
  UsersIcon,
} from "lucide-react"

import { FunnelSteps } from "@/components/admin/metrics/funnel-steps"
import { KpiRow, type KpiItem } from "@/components/admin/metrics/kpi-row"
import {
  MetricsGrid,
  StatList,
} from "@/components/admin/metrics/metrics-section"
import {
  ChartSummary,
  MetricsTrendCard,
} from "@/components/admin/metrics/metrics-trend-card"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  centsToUnits,
  formatCount,
  formatDays,
  formatEurCents,
  formatRate,
  sumOf,
} from "@/lib/admin-metrics/format"
import { periodPhrases } from "@/lib/admin-metrics/period"

const SERIES_CONFIG = {
  revenue: { color: "var(--primary)", label: "Chiffre d'affaires (€)" },
  orders: { color: "var(--chart-3)", label: "Commandes" },
}

function revenueKpis({ kpis }: RevenueMetrics): KpiItem[] {
  return [
    {
      icon: EuroIcon,
      kpi: kpis.revenueCents,
      label: "Chiffre d'affaires",
      tone: "primary",
      hint: "Brut, avant frais Stripe",
      value: formatEurCents(kpis.revenueCents.value),
    },
    {
      icon: ReceiptIcon,
      kpi: kpis.paidOrders,
      label: "Commandes payées",
      tone: "info",
      value: formatCount(kpis.paidOrders.value),
    },
    {
      icon: ShoppingBasketIcon,
      kpi: kpis.averageBasketCents,
      label: "Panier moyen",
      tone: "spark",
      value: formatEurCents(kpis.averageBasketCents.value),
    },
    {
      icon: UserCheckIcon,
      kpi: kpis.buyers,
      label: "Acheteurs",
      tone: "success",
      value: formatCount(kpis.buyers.value),
    },
    {
      icon: UsersIcon,
      kpi: kpis.revenuePerActiveCents,
      label: "CA par compte actif",
      tone: "info",
      value: formatEurCents(kpis.revenuePerActiveCents.value),
    },
  ]
}

/**
 * "Revenus": what came in, from whom, through which offers, and how far a
 * new account gets before it pays.
 */
export function RevenueSections({ data }: { data: RevenueMetrics }) {
  const { bucket, period } = data.window
  const series = data.series.map((point) => ({
    date: point.date,
    orders: point.orders,
    revenue: centsToUnits(point.revenueCents),
  }))

  return (
    <>
      <KpiRow items={revenueKpis(data)} />
      <div className="px-4 lg:px-6">
        <Card size="sm">
          <CardContent>
            <StatList
              items={[
                {
                  label: "Taux de réachat",
                  value: formatRate(data.repeatBuyerRate),
                },
                {
                  label: "Délai médian avant le 1er achat",
                  value: formatDays(data.medianDaysToFirstPurchase),
                },
                {
                  label: "Paniers abandonnés",
                  value: formatRate(data.abandonedCheckoutRate),
                },
              ]}
            />
          </CardContent>
        </Card>
      </div>
      <MetricsGrid>
        <MetricsTrendCard
          bucket={bucket}
          config={SERIES_CONFIG}
          data={series}
          description={`Encaissements et commandes, ${periodPhrases[period]}`}
          footer={
            <ChartSummary>
              Sur la période :{" "}
              {formatEurCents(sumOf(data.series, "revenueCents"))} pour{" "}
              {formatCount(sumOf(data.series, "orders"))} commandes.
            </ChartSummary>
          }
          series={[{ key: "revenue" }, { key: "orders" }]}
          title="Chiffre d'affaires"
        />
        <ConversionCard funnel={data.funnel} />
        <OffersCard offers={data.offers} />
        <CreditsCard credits={data.credits} />
      </MetricsGrid>
    </>
  )
}

function ConversionCard({ funnel }: { funnel: RevenueMetrics["funnel"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversion</CardTitle>
        <CardDescription>
          Les comptes créés sur la période, jusqu&apos;au deuxième achat.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FunnelSteps
          steps={[
            { count: funnel.signups, label: "Inscription" },
            { count: funnel.onboarded, label: "Onboarding terminé" },
            { count: funnel.firstGeneration, label: "1re génération" },
            { count: funnel.firstPurchase, label: "1er achat" },
            { count: funnel.repeatPurchase, label: "Réachat" },
          ]}
        />
      </CardContent>
    </Card>
  )
}

function OffersCard({ offers }: { offers: RevenueMetrics["offers"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ventes par offre</CardTitle>
        <CardDescription>
          Les packs de crédits achetés sur la période.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {offers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune vente sur la période.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Offre</TableHead>
                <TableHead className="text-right">Commandes</TableHead>
                <TableHead className="text-right">Crédits</TableHead>
                <TableHead className="text-right">CA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offers.map((offer) => (
                <TableRow key={offer.offerName}>
                  <TableCell className="font-medium">
                    {offer.offerName}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCount(offer.orders)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCount(offer.credits)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatEurCents(offer.revenueCents)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function CreditsCard({ credits }: { credits: RevenueMetrics["credits"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Crédits</CardTitle>
        <CardDescription>
          Ce qui est entré dans les soldes, et ce qui en est sorti.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <StatList
          items={[
            { label: "Vendus", value: formatCount(credits.sold) },
            { label: "Bienvenue", value: formatCount(credits.welcome) },
            {
              label: "Offerts par l'équipe",
              value: formatCount(credits.granted),
            },
            { label: "Consommés", value: formatCount(credits.consumed) },
          ]}
        />
      </CardContent>
    </Card>
  )
}
