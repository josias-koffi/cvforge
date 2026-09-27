import type { AcquisitionFunnel } from "@cvforge/types"

import { FunnelSteps } from "@/components/admin/metrics/funnel-steps"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { acquisitionToolLabels } from "@/lib/admin-metrics/labels"

/** Index of the "result shown" step: the call to action and the email both follow it. */
const RESULT_STEP = 1

/**
 * One free tool of the landing, from the page view to the account (US-131).
 * Clicking the call to action and leaving an email are two answers to the
 * same result, so both are rated against it, not against each other.
 */
export function FunnelCard({ funnel }: { funnel: AcquisitionFunnel }) {
  const { accountsActivated, ctaClicks, emailsSubmitted, results, visitors } =
    funnel

  return (
    <Card>
      <CardHeader>
        <CardTitle>{acquisitionToolLabels[funnel.tool]}</CardTitle>
        <CardDescription>
          Visiteurs uniques par jour et par étape, sans cookie.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <FunnelSteps
          showFromStart={false}
          steps={[
            { count: visitors, label: "Visiteurs" },
            { count: results, label: "Résultat affiché" },
            {
              against: RESULT_STEP,
              count: ctaClicks,
              label: "Clic sur l'appel à l'action",
            },
            {
              against: RESULT_STEP,
              count: emailsSubmitted,
              label: "Email saisi",
            },
            { count: accountsActivated, label: "Compte activé" },
          ]}
        />
        {accountsActivated === null ? (
          <p className="text-xs text-muted-foreground">
            Activation non mesurée : cet outil ne demande pas encore
            d&apos;email.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
