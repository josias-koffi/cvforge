import { DEFAULT_JOB_ALERT_PREFERENCES } from "@cvforge/types"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/app/(app)/notifications/actions", () => ({
  updateJobAlertPreference: vi.fn(),
}))

import { JobAlertPreferences } from "@/components/notifications/job-alert-preferences"

describe("JobAlertPreferences (US-166)", () => {
  it("shows the switch, the threshold and the rhythm, and says it is free", () => {
    const html = renderToStaticMarkup(
      <JobAlertPreferences
        preferences={{ ...DEFAULT_JOB_ALERT_PREFERENCES, rhythm: "hourly" }}
      />
    )

    expect(html).toContain("Alertes nouvelles offres")
    expect(html).toContain("Gratuit.")
    expect(html).toContain("Très proches")
    expect(html).toContain("Toutes les heures")
    expect(html).toContain("21 h et 7 h")
    expect(
      html.match(/aria-checked="true"|data-state="on"/g)?.length
    ).toBeGreaterThanOrEqual(2)
  })

  it("greys out the choices while alerts are off", () => {
    const html = renderToStaticMarkup(
      <JobAlertPreferences
        preferences={{ ...DEFAULT_JOB_ALERT_PREFERENCES, enabled: false }}
      />
    )

    expect(html.match(/disabled=""/g)?.length).toBeGreaterThanOrEqual(4)
  })

  it("offers the paid analysis, off by default, with its price (US-168)", () => {
    const html = renderToStaticMarkup(
      <JobAlertPreferences preferences={DEFAULT_JOB_ALERT_PREFERENCES} />
    )

    expect(html).toContain("Analyse IA de mes alertes")
    expect(html).toContain(
      "1 crédit par jour où au moins une alerte est analysée, analyses illimitées ce jour-là"
    )
    expect(html).toContain("Sans crédit, l&#x27;alerte part quand même")
    expect(html).toMatch(
      /id="job-alerts-ai"[^>]*aria-checked="false"|aria-checked="false"[^>]*id="job-alerts-ai"/
    )
    // The filter waits for the analysis to be switched on.
    expect(html).toMatch(
      /id="job-alerts-ai-filter"[^>]*disabled=""|disabled=""[^>]*id="job-alerts-ai-filter"/
    )
  })

  it("lets the candidate turn the filter off once the analysis is on", () => {
    const html = renderToStaticMarkup(
      <JobAlertPreferences
        preferences={{ ...DEFAULT_JOB_ALERT_PREFERENCES, aiAnalysis: true }}
      />
    )

    expect(html).toContain("Ne pas m&#x27;alerter pour les offres « à passer »")
    expect(html).not.toMatch(
      /id="job-alerts-ai-filter"[^>]*disabled=""|disabled=""[^>]*id="job-alerts-ai-filter"/
    )
  })
})
