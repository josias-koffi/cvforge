import type { UsageMetrics } from "@cvforge/types"
import {
  BriefcaseBusinessIcon,
  FileTextIcon,
  FileUpIcon,
  MailIcon,
  MicIcon,
  ScanSearchIcon,
} from "lucide-react"

import { KpiRow, type KpiItem } from "@/components/admin/metrics/kpi-row"
import {
  MetricsGrid,
  StatList,
} from "@/components/admin/metrics/metrics-section"
import {
  ChartSummary,
  MetricsTrendCard,
} from "@/components/admin/metrics/metrics-trend-card"
import { RankedListCard } from "@/components/admin/metrics/ranked-list-card"
import { RetentionTable } from "@/components/admin/metrics/retention-table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  formatCount,
  formatMinutes,
  formatRate,
  sumOf,
} from "@/lib/admin-metrics/format"
import { periodPhrases } from "@/lib/admin-metrics/period"

const SERIES_CONFIG = {
  applications: { color: "var(--primary)", label: "Candidatures" },
  cvGenerated: { color: "var(--chart-2)", label: "CV générés" },
  lettersGenerated: { color: "var(--chart-3)", label: "Lettres générées" },
  interviews: { color: "var(--chart-4)", label: "Entretiens" },
}

function usageKpis({ kpis }: UsageMetrics): KpiItem[] {
  return [
    {
      icon: BriefcaseBusinessIcon,
      kpi: kpis.applications,
      label: "Candidatures créées",
      tone: "primary",
      value: formatCount(kpis.applications.value),
    },
    {
      icon: FileTextIcon,
      kpi: kpis.cvGenerated,
      label: "CV générés",
      tone: "info",
      value: formatCount(kpis.cvGenerated.value),
    },
    {
      icon: MailIcon,
      kpi: kpis.lettersGenerated,
      label: "Lettres générées",
      tone: "info",
      value: formatCount(kpis.lettersGenerated.value),
    },
    {
      icon: FileUpIcon,
      kpi: kpis.cvImported,
      label: "CV importés",
      tone: "spark",
      value: formatCount(kpis.cvImported.value),
    },
    {
      icon: MicIcon,
      kpi: kpis.interviews,
      label: "Entretiens simulés",
      tone: "success",
      value: formatCount(kpis.interviews.value),
    },
    {
      icon: ScanSearchIcon,
      kpi: kpis.atsScans,
      label: "Analyses ATS",
      tone: "warning",
      value: formatCount(kpis.atsScans.value),
    },
  ]
}

/**
 * "Produit": what people do once signed up, which templates they pick, and
 * whether they come back.
 */
export function UsageSections({ data }: { data: UsageMetrics }) {
  const { bucket, period } = data.window

  return (
    <>
      <KpiRow items={usageKpis(data)} />
      <MetricsGrid>
        <MetricsTrendCard
          bucket={bucket}
          config={SERIES_CONFIG}
          data={data.series}
          description={`Ce que les comptes produisent, ${periodPhrases[period]}`}
          footer={
            <ChartSummary>
              Sur la période : {formatCount(sumOf(data.series, "applications"))}{" "}
              candidatures, {formatCount(sumOf(data.series, "cvGenerated"))} CV,{" "}
              {formatCount(sumOf(data.series, "lettersGenerated"))} lettres et{" "}
              {formatCount(sumOf(data.series, "interviews"))} entretiens.
            </ChartSummary>
          }
          series={[
            { key: "applications" },
            { key: "cvGenerated" },
            { key: "lettersGenerated" },
            { key: "interviews" },
          ]}
          title="Activité"
        />
        <EngagementCard data={data} />
        <RankedListCard
          description="Les modèles des CV générés sur la période."
          items={data.cvTemplates}
          title="Modèles de CV"
        />
        <RankedListCard
          description="Les modèles des lettres générées sur la période."
          items={data.letterTemplates}
          title="Modèles de lettre"
        />
        <AtsScoresCard scores={data.atsScoresByEngine} />
        <RetentionTable cohorts={data.retention} />
      </MetricsGrid>
    </>
  )
}

function EngagementCard({ data }: { data: UsageMetrics }) {
  const { abandoned, averageMinutes, completed } = data.interviews

  return (
    <Card>
      <CardHeader>
        <CardTitle>Engagement</CardTitle>
        <CardDescription>
          Onboarding et entretiens simulés sur la période.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <StatList
          items={[
            {
              label: "Onboarding terminé",
              value: formatRate(data.onboardingRate),
            },
            { label: "Entretiens terminés", value: formatCount(completed) },
            { label: "Entretiens abandonnés", value: formatCount(abandoned) },
            { label: "Durée moyenne", value: formatMinutes(averageMinutes) },
          ]}
        />
      </CardContent>
    </Card>
  )
}

/**
 * One line per scoring engine: the ATS scale is versioned, so an average
 * across two versions would measure the rescale, not the CVs (ADR-021).
 */
function AtsScoresCard({
  scores,
}: {
  scores: UsageMetrics["atsScoresByEngine"]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Score ATS moyen</CardTitle>
        <CardDescription>
          Par version du barème, jamais mélangées.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {scores.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun CV noté sur la période.
          </p>
        ) : (
          <StatList
            items={scores.map((row) => ({
              label: `Barème ${row.engineVersion} (${formatCount(row.scoredCvCount)} CV)`,
              value: `${formatCount(row.averageScore)} / 100`,
            }))}
          />
        )}
      </CardContent>
    </Card>
  )
}
