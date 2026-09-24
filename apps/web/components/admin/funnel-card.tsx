import type { AcquisitionTool } from "@cvforge/types"

import { MetricCard } from "@/components/admin/metric-card"
import type { AcquisitionFunnel } from "@/lib/metrics"

const TOOL_LABELS: Record<AcquisitionTool, string> = {
  ats: "Analyse ATS",
  keyword_match: "Comparateur CV ↔ offre",
}

function countOf(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value)
}

/**
 * A step with its rate against the step before. No rate when the step before
 * is empty: on a funnel nobody entered yet, "0 %" reads as a failure.
 */
function stepValue(count: number, previous: number) {
  return previous > 0
    ? `${countOf(count)} · ${Math.round((count / previous) * 100)} %`
    : countOf(count)
}

/**
 * One free tool of the landing, from the page view to the account (US-131).
 *
 * Numbers rather than a drawn funnel: with a few dozen visitors, bars would
 * dramatise a gap of one or two people.
 */
export function FunnelCard({
  funnel,
  windowDays,
}: {
  funnel: AcquisitionFunnel
  windowDays: number
}) {
  const { accountsActivated, ctaClicks, emailsSubmitted, results, visitors } =
    funnel

  return (
    <MetricCard
      label={`Tunnel · ${TOOL_LABELS[funnel.tool]} (${windowDays} j)`}
      value={countOf(visitors)}
      breakdown={[
        { label: "Résultat affiché", value: stepValue(results, visitors) },
        {
          label: "Clic sur l'appel à l'action",
          value: stepValue(ctaClicks, results),
        },
        { label: "Email saisi", value: stepValue(emailsSubmitted, results) },
        {
          label: "Compte activé",
          value:
            accountsActivated === null
              ? "—"
              : stepValue(accountsActivated, emailsSubmitted),
        },
      ]}
      hint={`Visiteurs uniques par jour et par étape, sans cookie.${
        accountsActivated === null
          ? " Activation non mesurée : cet outil ne demande pas encore d'email."
          : ""
      }`}
    />
  )
}
