import type { RetentionCohort } from "@cvforge/types"

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
  formatBucketLong,
  formatCount,
  formatRate,
} from "@/lib/admin-metrics/format"

const NUMERIC = "text-right tabular-nums"

/**
 * Who comes back, by signup month. A young cohort has a blank J+30 until the
 * month is old enough: the API sends null, shown as "—" rather than 0 %.
 */
export function RetentionTable({
  cohorts,
}: {
  cohorts: readonly RetentionCohort[]
}) {
  return (
    <Card className="@3xl/main:col-span-2">
      <CardHeader>
        <CardTitle>Rétention par cohorte</CardTitle>
        <CardDescription>
          Part des inscrits du mois encore actifs 7 et 30 jours après leur
          inscription.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {cohorts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune inscription à suivre.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mois d&apos;inscription</TableHead>
                <TableHead className="text-right">Inscrits</TableHead>
                <TableHead className="text-right">Actifs à J+7</TableHead>
                <TableHead className="text-right">Actifs à J+30</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cohorts.map((cohort) => (
                <TableRow key={cohort.cohort}>
                  <TableCell className="font-medium capitalize">
                    {formatBucketLong(cohort.cohort, "month")}
                  </TableCell>
                  <TableCell className={NUMERIC}>
                    {formatCount(cohort.signups)}
                  </TableCell>
                  <TableCell className={NUMERIC}>
                    {formatRate(cohort.activeAfter7Days)}
                  </TableCell>
                  <TableCell className={NUMERIC}>
                    {formatRate(cohort.activeAfter30Days)}
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
