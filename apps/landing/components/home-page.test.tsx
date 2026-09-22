import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({ usePathname: () => "/fr" }))

import { HomePage } from "@/components/home-page"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { StoryPage } from "@/components/story-page"
import { en } from "@/content/en"
import { fr } from "@/content/fr"
import type { PublicCreditOffer } from "@cvforge/types"

const offers: PublicCreditOffer[] = [
  {
    credits: 90,
    currency: "eur",
    description: { en: "Get going", fr: "Pour démarrer" },
    features: { en: ["One-time payment, no subscription"], fr: ["Paiement unique, sans abonnement"] },
    id: "o-essentiel",
    isFeatured: false,
    name: { en: "Essential", fr: "Essentiel" },
    priceCents: 590,
    slug: "essentiel",
    sortOrder: 10,
  },
  {
    credits: 350,
    currency: "eur",
    description: { en: "", fr: "" },
    features: { en: ["Every feature included"], fr: ["Tout inclus"] },
    id: "o-recherche-active",
    isFeatured: true,
    name: { en: "Active search", fr: "Recherche active" },
    priceCents: 1490,
    slug: "recherche-active",
    sortOrder: 20,
  },
]

const escapeHtml = (text: string) =>
  text.replaceAll("'", "&#x27;").replaceAll('"', "&quot;")

describe("HomePage", () => {
  it.each([
    ["fr", fr],
    ["en", en],
  ] as const)("renders the %s hero, pricing and FAQ", (locale, dict) => {
    const html = renderToStaticMarkup(
      <HomePage locale={locale} offers={offers} withTestimonials={false} />
    )

    expect(html).toContain(dict.hero.titleAccent)
    expect(html).toContain('id="pricing"')
    expect(html).toContain(locale === "fr" ? "Essentiel" : "Essential")
    expect(html).toContain(escapeHtml(dict.pricing.welcome))
    expect(html).toContain(
      locale === "fr" ? "20 candidatures" : "20 applications"
    )
    expect(html).toContain(dict.pricing.popular)
    expect(html).toContain(locale === "fr" ? "Paiement unique, sans abonnement" : "One-time payment, no subscription")
    expect(html).toContain(escapeHtml(dict.faq.items[0].question))
    expect(html).toContain('href="/login"')
  })

  it.each([
    ["fr", fr],
    ["en", en],
  ] as const)("sells the mock interview in %s", (locale, dict) => {
    const html = renderToStaticMarkup(
      <HomePage locale={locale} offers={offers} withTestimonials={false} />
    )

    expect(html).toContain('id="interview"')
    expect(html).toContain(escapeHtml(dict.interview.title))

    // The five recruiter styles and the five scored dimensions are the
    // substance of the section; a half-filled dictionary would show neither.
    for (const profile of dict.interview.profiles) {
      expect(html).toContain(profile.title)
    }
    for (const metric of dict.interview.report.metrics) {
      expect(html).toContain(metric)
    }

    // Audio retention is a promise, not decoration: it must reach the page.
    expect(html).toContain(escapeHtml(dict.interview.privacyNote))
    expect(html).toContain("%2Fscreenshots%2Flight%2Finterview-studio.webp")
  })

  it("shows no price when the offers cannot be loaded", () => {
    const html = renderToStaticMarkup(
      <HomePage locale="fr" offers={null} withTestimonials={false} />
    )

    expect(html).toContain(escapeHtml(fr.pricing.unavailable))
    expect(html).not.toContain(fr.pricing.popular)
    expect(html).not.toContain("€")
  })

  it("hides placeholder testimonials unless enabled", () => {
    const hidden = renderToStaticMarkup(
      <HomePage locale="fr" offers={offers} withTestimonials={false} />
    )
    const shown = renderToStaticMarkup(
      <HomePage locale="fr" offers={offers} withTestimonials />
    )

    expect(hidden).not.toContain(fr.testimonials.items[0].name)
    expect(shown).toContain(fr.testimonials.items[0].name)
  })

  it("gives every screenshot localized alt text", () => {
    const html = renderToStaticMarkup(
      <HomePage locale="en" offers={offers} withTestimonials={false} />
    )

    expect(html).toContain(`alt="${en.showcase.tabs[0].alt}"`)
    expect(html).toContain("%2Fscreenshots%2Fdark%2Fcv-editor.webp")
  })
})

describe("SiteHeader", () => {
  /**
   * Two destinations stay in the open because they are what a visitor comes to
   * decide on — the price and the free check, which is the top of the funnel.
   */
  it("keeps pricing and the free ATS check one click away", () => {
    const html = renderToStaticMarkup(<SiteHeader locale="fr" nav={fr.nav} />)

    expect(html).toContain('href="/fr#pricing"')
    expect(html).toContain('href="/fr/analyse-ats"')
    expect(html).toContain('href="/en"')
  })

  it("groups the rest behind a labelled trigger", () => {
    const html = renderToStaticMarkup(<SiteHeader locale="fr" nav={fr.nav} />)

    expect(html).toContain(fr.nav.product)
    // Radix renders the menu in a portal, so its items are absent until it is
    // opened — which is exactly why the footer keeps the full list.
    expect(html).not.toContain('href="/fr#features"')
  })

  it("does not crowd the bar: at most three navigation entries", () => {
    const html = renderToStaticMarkup(<SiteHeader locale="fr" nav={fr.nav} />)
    const nav = html.slice(html.indexOf('aria-label="Main"'))
    const entries = nav.slice(0, nav.indexOf("</nav>")).split("<li").length - 1

    expect(entries).toBeLessThanOrEqual(3)
  })

  it("translates the grouping label", () => {
    const html = renderToStaticMarkup(<SiteHeader locale="en" nav={en.nav} />)

    expect(html).toContain(en.nav.product)
    expect(html).toContain('href="/en/ats-check"')
  })
})

describe("SiteFooter", () => {
  it("links to the four legal documents, in the page's language", () => {
    const html = renderToStaticMarkup(<SiteFooter locale="fr" dict={fr} />)

    expect(html).toContain('href="/fr/legal/cgu"')
    expect(html).toContain('href="/fr/legal/cgv"')
    expect(html).toContain('href="/fr/legal/mentions-legales"')
    expect(html).toContain('href="/fr/legal/confidentialite"')
    expect(html).toContain(fr.footer.legal)
  })

  it("serves the English addresses on the English site", () => {
    const html = renderToStaticMarkup(<SiteFooter locale="en" dict={en} />)

    expect(html).toContain('href="/en/legal/terms"')
    expect(html).toContain('href="/en/legal/privacy"')
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
