import { atsSlugs, locales, type Locale } from "@/lib/i18n"

/**
 * The free ATS check has one address per language, like the story and the legal
 * pages: a link shared in French lands on French wording rather than on a 404.
 *
 * The route folder is named after the English slug and the French one is
 * rewritten onto it in next.config — the same arrangement `story` uses. The
 * slugs themselves live in `lib/i18n` beside `storySlugs`, because the language
 * switcher has to know about them to translate the current path.
 */
export { atsSlugs }

export function atsPath(locale: Locale) {
  return `/${locale}/${atsSlugs[locale]}`
}

/** True when a URL segment names the ATS page in any language. */
export function isAtsSlug(segment: string) {
  return locales.some((locale) => atsSlugs[locale] === segment)
}
