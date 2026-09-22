import { legalDocumentSlugs, type LegalDocumentSlug } from "@cvforge/types"

import { locales, type Locale } from "@/lib/i18n"

/** Shared with the back-office preview, so both render the same text. */
export { parseLegalBody, type LegalBlock } from "@cvforge/types"

/**
 * The URL each document is served under, per language. The slug is the
 * contract's stable key; these are the addresses people read and share.
 */
export const legalSlugs: Record<LegalDocumentSlug, Record<Locale, string>> = {
  terms: { fr: "cgu", en: "terms" },
  "sales-terms": { fr: "cgv", en: "sales-terms" },
  "legal-notice": { fr: "mentions-legales", en: "legal-notice" },
  privacy: { fr: "confidentialite", en: "privacy" },
}

export function legalPath(locale: Locale, slug: LegalDocumentSlug) {
  return `/${locale}/legal/${legalSlugs[slug][locale]}`
}

/** The document a localised URL segment names, whichever language wrote it. */
export function legalSlugFromPath(segment: string): LegalDocumentSlug | null {
  return (
    legalDocumentSlugs.find((slug) =>
      locales.some((locale) => legalSlugs[slug][locale] === segment)
    ) ?? null
  )
}
