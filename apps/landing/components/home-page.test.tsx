import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({ usePathname: () => "/fr" }))

import { HomePage } from "@/components/home-page"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { StoryPage } from "@/components/story-page"
import { ToolsPage } from "@/components/tools-page"
import { en } from "@/content/en"
import { fr } from "@/content/fr"
import type { PublicCreditOffer } from "@cvforge/types"

const offers: PublicCreditOffer[] = [
  {
    credits: 90,
    currency: "eur",
    description: { en: "Get going", fr: "Pour démarrer" },
    features: {
      en: ["One-time payment, no subscription"],
      fr: ["Paiement unique, sans abonnement"],
    },
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
    expect(html).toContain(
      locale === "fr"
        ? "Paiement unique, sans abonnement"
        : "One-time payment, no subscription"
    )
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

  it.each([
    ["fr", fr, "/fr/analyse-ats"],
    ["en", en, "/en/ats-check"],
  ] as const)(
    "serves every FAQ answer and the ATS check link in the %s HTML",
    (locale, dict, atsHref) => {
      const html = renderToStaticMarkup(
        <HomePage locale={locale} offers={offers} withTestimonials={false} />
      )

      for (const { answer } of dict.faq.items) {
        expect(html).toContain(escapeHtml(answer))
      }
      expect(html).toContain(`href="${atsHref}"`)
    }
  )
})

describe("SiteHeader", () => {
  /**
   * Two destinations stay in the open because they are what a visitor comes to
   * decide on — the price and the free check, which is the top of the funnel.
   */
  it("keeps pricing and the free tools one click away", () => {
    const html = renderToStaticMarkup(<SiteHeader locale="fr" nav={fr.nav} />)

    expect(html).toContain('href="/fr#pricing"')
    expect(html).toContain('href="/fr/outils"')
    expect(html).toContain(fr.nav.tools)
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
    expect(html).toContain('href="/en/tools"')
  })
})

/** The free tools, on the home page and on their own hub (US-135). */
describe("the free tools", () => {
  it.each([
    ["fr", fr, "/fr/outils", "/fr/analyse-ats"],
    ["en", en, "/en/tools", "/en/ats-check"],
  ] as const)(
    "gets a section on the %s home page, between how it works and features",
    (locale, dict, hubHref, atsHref) => {
      const html = renderToStaticMarkup(
        <HomePage locale={locale} offers={offers} withTestimonials={false} />
      )
      const section = html.indexOf('id="free-tools"')

      expect(section).toBeGreaterThan(html.indexOf('id="how-it-works"'))
      expect(section).toBeLessThan(html.indexOf('id="features"'))
      expect(html).toContain(escapeHtml(dict.tools.home.title))
      expect(html).toContain(escapeHtml(dict.tools.items.ats.name))
      expect(html).toContain(`href="${hubHref}"`)
      expect(html.slice(section)).toContain(`href="${atsHref}"`)
    }
  )

  it.each([
    ["fr", fr, "/fr/analyse-ats"],
    ["en", en, "/en/ats-check"],
  ] as const)("has a %s hub with one h1 and a card per tool", (locale, dict, atsHref) => {
    const html = renderToStaticMarkup(<ToolsPage locale={locale} />)

    expect(html.match(/<h1/g)).toHaveLength(1)
    expect(html).toContain(escapeHtml(dict.tools.title))
    expect(html).toContain(`href="${atsHref}"`)
    expect(html).toContain(
      `href="${locale === "fr" ? "/fr/comparateur-cv-offre" : "/en/cv-job-match"}"`
    )
    expect(html).toContain(escapeHtml(dict.tools.items.keyword_match.name))
    expect(html).toContain('href="/login"')
  })

  it("lists the hub and the check in the footer", () => {
    const html = renderToStaticMarkup(<SiteFooter locale="fr" dict={fr} />)

    expect(html).toContain('href="/fr/outils"')
    expect(html).toContain('href="/fr/analyse-ats"')
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

/** The free ATS check, for the visitor not ready to sign up yet (US-134). */
describe("the links to the free ATS check", () => {
  it.each([
    ["fr", fr, "/fr/analyse-ats"],
    ["en", en, "/en/ats-check"],
  ] as const)(
    "appear in the hero and the final call to action (%s)",
    (locale, dict, path) => {
      const html = renderToStaticMarkup(
        <HomePage locale={locale} offers={offers} withTestimonials={false} />
      )

      expect(html.split(`href="${path}"`).length - 1).toBeGreaterThanOrEqual(2)
      expect(html).toContain(dict.hero.atsLink)
      expect(html).toContain(dict.cta.atsLink)
    }
  )
})
