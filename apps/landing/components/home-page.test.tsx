import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({ usePathname: () => "/fr" }))

import { HomePage } from "@/components/home-page"
import { SiteHeader } from "@/components/site-header"
import { StoryPage } from "@/components/story-page"
import { en } from "@/content/en"
import { fr } from "@/content/fr"

const escapeHtml = (text: string) =>
  text.replaceAll("'", "&#x27;").replaceAll('"', "&quot;")

describe("HomePage", () => {
  it.each([
    ["fr", fr],
    ["en", en],
  ] as const)("renders the %s hero, pricing and FAQ", (locale, dict) => {
    const html = renderToStaticMarkup(
      <HomePage locale={locale} withTestimonials={false} />
    )

    expect(html).toContain(dict.hero.titleAccent)
    expect(html).toContain('id="pricing"')
    expect(html).toContain("Starter")
    expect(html).toContain(escapeHtml(dict.faq.items[0].question))
    expect(html).toContain('href="/login"')
  })

  it("hides placeholder testimonials unless enabled", () => {
    const hidden = renderToStaticMarkup(
      <HomePage locale="fr" withTestimonials={false} />
    )
    const shown = renderToStaticMarkup(
      <HomePage locale="fr" withTestimonials />
    )

    expect(hidden).not.toContain(fr.testimonials.items[0].name)
    expect(shown).toContain(fr.testimonials.items[0].name)
  })

  it("gives every screenshot localized alt text", () => {
    const html = renderToStaticMarkup(
      <HomePage locale="en" withTestimonials={false} />
    )

    expect(html).toContain(`alt="${en.showcase.tabs[0].alt}"`)
    expect(html).toContain("%2Fscreenshots%2Fdark%2Fcv-editor.webp")
  })
})

describe("SiteHeader", () => {
  it("links to sections, the localized story and the language switch", () => {
    const html = renderToStaticMarkup(<SiteHeader locale="fr" nav={fr.nav} />)

    expect(html).toContain('href="/fr#pricing"')
    expect(html).toContain('href="/fr/histoire"')
    expect(html).toContain('href="/en"')
  })
})

describe("StoryPage", () => {
  it("renders the manifesto and the four principles", () => {
    const html = renderToStaticMarkup(<StoryPage locale="en" />)

    expect(html).toContain(en.story.title)
    for (const principle of en.story.principles) {
      expect(html).toContain(principle.title)
    }
  })
})
