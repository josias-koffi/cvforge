import type { AiCostMetrics, Rate } from "@cvforge/types"
import { cn } from "cn"

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
  formatCount,
  formatDurationMs,
  formatEurCents,
  formatRate,
  formatUsd,
  ratio,
} from "@/lib/admin-metrics/format"
import { aiFeatureLabels, creditActionLabel } from "@/lib/admin-metrics/labels"

/** Below this margin a unit barely pays for its AI: the cockpit insights use the same 30 %. */
export const THIN_MARGIN_RATE = 30

const NUMERIC = "text-right tabular-nums"

/** A card around a table that scrolls sideways on a phone. */
function TableCard({
  children,
  description,
  empty,
  isEmpty,
  title,
}: {
  children: React.ReactNode
  description: string
  empty: string
  isEmpty: boolean
  title: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}

/** Margin coloured by health: negative loses money, thin barely pays. */
export function marginClass(rate: Rate) {
  if (rate === null) return "text-muted-foreground"
  if (rate < 0) return "text-destructive"
  if (rate < THIN_MARGIN_RATE) return "text-warning"

  return "text-success"
}

/** What a CV, a letter or an interview minute costs against what it earns. */
export function UnitEconomicsTable({
  units,
}: {
  units: AiCostMetrics["units"]
}) {
  return (
    <TableCard
      description="Coût IA d'une unité facturée contre ce que ses crédits rapportent, au prix moyen d'un crédit vendu."
      empty="Aucune action facturée sur la période."
      isEmpty={units.length === 0}
      title="Économie unitaire"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Action</TableHead>
            <TableHead className="text-right">Unités</TableHead>
            <TableHead className="text-right">Coût / unité</TableHead>
            <TableHead className="text-right">Revenu / unité</TableHead>
            <TableHead className="text-right">Marge</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {units.map((unit) => (
            <TableRow key={unit.action}>
              <TableCell className="font-medium">
                {creditActionLabel(unit.action)}
              </TableCell>
              <TableCell className={NUMERIC}>
                {formatCount(unit.units)}
              </TableCell>
              <TableCell className={NUMERIC}>
                {formatEurCents(unit.costPerUnitEurCents)}
              </TableCell>
              <TableCell className={NUMERIC}>
                {formatEurCents(unit.revenuePerUnitEurCents)}
              </TableCell>
              <TableCell
                className={cn(
                  NUMERIC,
                  "font-medium",
                  marginClass(unit.marginRate)
                )}
              >
                {formatRate(unit.marginRate)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableCard>
  )
}

/** Where the AI money goes, feature by feature. */
export function FeaturesTable({
  features,
}: {
  features: AiCostMetrics["features"]
}) {
  return (
    <TableCard
      description="Appels et coût de chaque usage de l'IA."
      empty="Aucun appel IA sur la période."
      isEmpty={features.length === 0}
      title="Par usage"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Usage</TableHead>
            <TableHead className="text-right">Appels</TableHead>
            <TableHead className="text-right">Erreurs</TableHead>
            <TableHead className="text-right">Tokens</TableHead>
            <TableHead className="text-right">Coût</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {features.map((row) => (
            <TableRow key={row.feature}>
              <TableCell className="font-medium">
                {aiFeatureLabels[row.feature] ?? row.feature}
              </TableCell>
              <TableCell className={NUMERIC}>
                {formatCount(row.calls)}
              </TableCell>
              <TableCell className={NUMERIC}>
                {formatRate(ratio(row.errors, row.calls))}
              </TableCell>
              <TableCell className={NUMERIC}>
                {formatCount(row.promptTokens + row.completionTokens)}
              </TableCell>
              <TableCell className={NUMERIC}>
                {formatUsd(row.costUsd)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableCard>
  )
}

/** Each model's share, reliability and speed. */
export function ModelsTable({ models }: { models: AiCostMetrics["models"] }) {
  return (
    <TableCard
      description="Un taux de secours élevé signale un modèle principal qui échoue souvent."
      empty="Aucun appel IA sur la période."
      isEmpty={models.length === 0}
      title="Par modèle"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Modèle</TableHead>
            <TableHead className="text-right">Appels</TableHead>
            <TableHead className="text-right">Tokens</TableHead>
            <TableHead className="text-right">Coût</TableHead>
            <TableHead className="text-right">Secours</TableHead>
            <TableHead className="text-right">Erreurs</TableHead>
            <TableHead className="text-right">Durée moy.</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {models.map((row) => (
            <TableRow key={row.model}>
              <TableCell className="font-mono text-xs">{row.model}</TableCell>
              <TableCell className={NUMERIC}>
                {formatCount(row.calls)}
              </TableCell>
              <TableCell className={NUMERIC}>
                {formatCount(row.promptTokens + row.completionTokens)}
              </TableCell>
              <TableCell className={NUMERIC}>
                {formatUsd(row.costUsd)}
              </TableCell>
              <TableCell className={NUMERIC}>
                {formatRate(row.fallbackRate)}
              </TableCell>
              <TableCell className={NUMERIC}>
                {formatRate(row.errorRate)}
              </TableCell>
              <TableCell className={NUMERIC}>
                {formatDurationMs(row.averageDurationMs)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableCard>
  )
}
