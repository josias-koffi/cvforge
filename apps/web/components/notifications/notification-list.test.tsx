import type { InAppNotification } from "@cvforge/types"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/app/(app)/notifications/actions", () => ({
  markNotificationRead: vi.fn(),
}))
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

import { NotificationList } from "@/components/notifications/notification-list"
import { dayHeading, parisDay } from "@/components/notifications/notification-style"

function notification(overrides: Partial<InAppNotification>): InAppNotification {
  return {
    createdAt: "2026-11-18T08:00:00.000Z",
    id: "n1",
    linkHref: "/offres-du-jour",
    message: "Doctolib, Nantes.",
    metadata: {},
    readAt: null,
    title: "Nouvelle offre : Développeur",
    type: "job_alert",
    userEmail: "ada@example.com",
    ...overrides,
  }
}

describe("NotificationList", () => {
  it("groups by Paris day and lists the offers of a grouped alert", () => {
    const offers = ["A", "B", "C", "D"].map((title) => ({
      companyName: "Doctolib",
      jobId: title,
      locationLabel: "Nantes",
      sourceLabel: "France Travail",
      title,
      verdict: title === "A" ? ("seize" as const) : null,
    }))
    const html = renderToStaticMarkup(
      <NotificationList
        unreadOnly={false}
        notifications={[
          notification({ id: "n1", metadata: { offers }, title: "4 nouvelles offres pour vous" }),
          // 23:30 UTC on the 16th is already 00:30 on the 17th in Paris.
          notification({ createdAt: "2026-11-16T23:30:00.000Z", id: "n2", readAt: "2026-11-17T08:00:00.000Z" }),
        ]}
      />
    )

    expect(html).toContain("4 nouvelles offres pour vous")
    expect(html).toContain("À saisir")
    expect(html).toContain("et 1 autre(s)")
    expect(html.match(/<section/g)).toHaveLength(2)
    expect(html.match(/aria-label="Non lue"/g)).toHaveLength(1)
    expect(html).toContain("00:30")
  })

  it("says when everything is read", () => {
    expect(
      renderToStaticMarkup(<NotificationList notifications={[]} unreadOnly />)
    ).toContain("Tout est lu")
  })
})

describe("dayHeading", () => {
  it("names today and yesterday, in Paris", () => {
    const now = Date.parse("2026-11-18T10:00:00Z")

    expect(dayHeading("2026-11-18", now)).toBe("Aujourd'hui")
    expect(dayHeading("2026-11-17", now)).toBe("Hier")
    expect(dayHeading("2026-11-10", now)).toBe("Mardi 10 novembre")
    expect(parisDay("2026-11-17T23:30:00Z")).toBe("2026-11-18")
  })
})
