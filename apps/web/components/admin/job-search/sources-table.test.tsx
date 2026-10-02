import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { QuotaAlert } from "@/components/admin/job-search/sources-table"
import type { JobSourceState } from "@/lib/job-boards"

const FRANCE_TRAVAIL: JobSourceState = {
  available: true,
  callsThisMonth: 8_200,
  callsToday: 410,
  consecutiveFailures: 0,
  enabled: true,
  implemented: true,
  lastListingCount: 0,
  lastRunAt: null,
  lastStatus: null,
  monthlyQuota: 10_000,
  quotaAlert: true,
  source: "france_travail",
}

describe("QuotaAlert", () => {
  it("names the source and how far into its quota it is", () => {
    const html = renderToStaticMarkup(
      <QuotaAlert sources={[FRANCE_TRAVAIL]} />
    )

    expect(html).toContain("Quota mensuel bientôt atteint")
    expect(html).toContain("8 200 appels sur 10 000")
    expect(html).toContain('role="alert"')
  })
})
