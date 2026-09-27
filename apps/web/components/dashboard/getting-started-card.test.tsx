import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/app/bienvenue/actions", () => ({ dismissGettingStarted: vi.fn() }))

const { GettingStartedCard } = await import(
  "@/components/dashboard/getting-started-card"
)

const items = [
  {
    description: "La base de vos CV.",
    done: true,
    href: "/profile/p1",
    id: "profil",
    label: "Compléter mon profil",
  },
  {
    description: "Vos critères.",
    done: false,
    href: "/ma-recherche",
    id: "criteres",
    label: "Définir ma recherche",
  },
]

describe("GettingStartedCard", () => {
  it("shows the progress and offers the onboarding back until finished", () => {
    const html = renderToStaticMarkup(
      <GettingStartedCard items={items} onboardingDone={false} />
    )

    expect(html).toContain("1 sur 2 étapes")
    expect(html).toContain('aria-valuenow="50"')
    expect(html).toContain('href="/bienvenue"')
    expect(html).toContain("Masquer « Bien démarrer »")
  })

  it("no longer offers the onboarding once it was finished", () => {
    expect(
      renderToStaticMarkup(
        <GettingStartedCard items={items} onboardingDone />
      )
    ).not.toContain('href="/bienvenue"')
  })
})
