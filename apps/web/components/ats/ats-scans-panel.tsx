import Link from "next/link"

import { AtsScoreBadge } from "@/components/applications/ats-score-badge"
import { scoreOf, type AtsScanSummary } from "@/lib/ats-report"
import { formatDate } from "@/lib/format"

/** The reports unlocked on the landing, on the dashboard (US-133). */
export function AtsScansPanel({ scans }: { scans: AtsScanSummary[] }) {
  if (scans.length === 0) return null

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Vos analyses ATS</h2>
      <ul className="divide-y rounded-xl border">
        {scans.slice(0, 3).map((scan) => (
          <li key={scan.scanId}>
            <Link
              className="flex items-center justify-between gap-4 px-4 py-3 text-sm hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              href={`/analyses-ats/${scan.scanId}`}
            >
              <span>
                Analyse du {formatDate(scan.unlockedAt)}
                <span className="block text-xs text-muted-foreground">
                  Consultable jusqu’au {formatDate(scan.expiresAt)}
                </span>
              </span>
              <AtsScoreBadge score={scoreOf(scan)} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
