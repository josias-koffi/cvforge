import { renderToStaticMarkup } from "react-dom/server"
import type { DraftApplication } from "@cvforge/types"
import { describe, expect, it, vi } from "vitest"

import { ExpiringApplications } from "@/components/offers/expiring-applications"

vi.mock("@/app/(app)/candidatures/actions", () => ({
  keepApplication: vi.fn(),
}))
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

function application(
  id: string,
  deletionScheduledAt: string | null,
  companyName = "Acme"
): DraftApplication {
  return {
    deletionScheduledAt,
    extracted: { companyName, title: `Poste ${id}` },
    id,
  } as DraftApplication
}

describe("ExpiringApplications (US-170)", () => {
  it("shows nothing when no application is about to go", () => {
    expect(
      renderToStaticMarkup(
        <ExpiringApplications applications={[application("a", null)]} />
      )
    ).toBe("")
  })

  it("lists the warned ones, soonest first, with their date and the way to keep them", () => {
    const html = renderToStaticMarkup(
      <ExpiringApplications
        applications={[
          application("late", "2026-10-30T08:00:00.000Z", ""),
          application("kept", null),
          application("soon", "2026-10-19T08:00:00.000Z"),
        ]}
      />
    )

    expect(html).toContain("2 candidatures vont être supprimées")
    expect(html.indexOf("Poste soon — Acme")).toBeLessThan(
      html.indexOf("Poste late")
    )
    expect(html).not.toContain("Poste kept")
    expect(html).not.toContain("Poste late — ")
    expect(html).toContain("Supprimée le 19 oct. 2026")
    expect(html.match(/<\/svg>Garder<\/button>/g)).toHaveLength(2)
    expect(html).toContain('href="/candidatures/soon"')
  })
})
