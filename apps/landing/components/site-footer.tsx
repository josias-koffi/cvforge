import { legalDocumentSlugs } from "@cvforge/types"
import Link from "next/link"
import type { ReactNode } from "react"

import { Brand } from "@/components/brand"
import { buildFeatureLinks, buildNavLinks } from "@/components/site-header"
import type { LandingDictionary } from "@/content/types"
import { homePath, type Locale } from "@/lib/i18n"
import { legalPath } from "@/lib/legal"

/** The legal documents, in the order the law is usually read. */
function buildLegalLinks(locale: Locale, legal: LandingDictionary["legal"]) {
  return legalDocumentSlugs.map((slug) => ({
    href: legalPath(locale, slug),
    label: legal.links[slug],
  }))
}

export function SiteFooter({
  locale,
  dict,
}: {
  locale: Locale
  dict: Pick<LandingDictionary, "nav" | "footer" | "legal" | "featurePages">
}) {
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12 sm:px-6 md:flex-row md:justify-between">
        <div className="flex max-w-xs flex-col gap-3">
          <Brand href={homePath(locale)} label={dict.nav.home} />
          <p className="text-sm text-muted-foreground">{dict.footer.tagline}</p>
        </div>
        <div className="flex flex-col gap-10 sm:flex-row sm:gap-12 lg:gap-16">
          <FooterNav title={dict.footer.features}>
            <LinkList
              links={buildFeatureLinks(locale, dict.featurePages)}
              columns={1}
            />
          </FooterNav>
          <FooterNav title={dict.footer.product}>
            <LinkList links={buildNavLinks(locale, dict.nav)} columns={2} />
          </FooterNav>
          <FooterNav title={dict.footer.legal}>
            <LinkList links={buildLegalLinks(locale, dict.legal)} columns={1} />
          </FooterNav>
        </div>
      </div>
      <div className="border-t">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted-foreground sm:px-6">
          © {new Date().getFullYear()} {dict.footer.company}.{" "}
          {dict.footer.rights}
        </p>
      </div>
    </footer>
  )
}

function FooterNav({ title, children }: { title: string; children: ReactNode }) {
  return (
    <nav aria-label={title}>
      <p className="mb-3 text-sm font-medium">{title}</p>
      {children}
    </nav>
  )
}

function LinkList({
  links,
  columns,
}: {
  links: { href: string; label: string }[]
  columns: 1 | 2
}) {
  return (
    <ul
      className={
        columns === 2
          ? "grid grid-cols-2 gap-x-10 gap-y-2 text-sm"
          : "flex flex-col gap-2 text-sm"
      }
    >
      {links.map((link) => (
        <li key={link.href}>
          <Link
            href={link.href}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  )
}
