export const locales = ["fr", "en"] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = "fr"

/** Localised slug of the "our story" page; FR is rewritten to the shared route. */
export const storySlugs: Record<Locale, string> = {
  fr: "histoire",
  en: "story",
}

export function hasLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value)
}

export function homePath(locale: Locale, anchor?: string) {
  return anchor ? `/${locale}#${anchor}` : `/${locale}`
}

export function storyPath(locale: Locale) {
  return `/${locale}/${storySlugs[locale]}`
}

/** Localised slug of the free ATS check; FR is rewritten to the shared route. */
export const atsSlugs: Record<Locale, string> = {
  fr: "analyse-ats",
  en: "ats-check",
}

/** Localised slug of the free CV ↔ offer comparator (US-136). */
export const keywordMatchSlugs: Record<Locale, string> = {
  fr: "comparateur-cv-offre",
  en: "cv-job-match",
}

/** The free "does this job hire near me?" tool (US-137). */
export const jobMarketSlugs: Record<Locale, string> = {
  fr: "metier-recrute",
  en: "job-market",
}

/** The free "check an employer" tool (US-139). */
export const companyCheckSlugs: Record<Locale, string> = {
  fr: "verifier-employeur",
  en: "employer-check",
}

/** The free "likely interview questions" tool (US-141). */
export const interviewQuestionsSlugs: Record<Locale, string> = {
  fr: "questions-entretien",
  en: "interview-questions",
}

/** Localised slug of the free tools hub (US-135); FR is rewritten to the shared route. */
export const toolsSlugs: Record<Locale, string> = {
  fr: "outils",
  en: "tools",
}

/**
 * Maps a landing path to its equivalent in another locale.
 *
 * Every page with a localised slug has to be listed here: without it the
 * language switcher keeps the current language's slug and lands on a 404.
 */
export function localizedPath(pathname: string, target: Locale) {
  const [, , ...rest] = pathname.split("/")
  const head = rest[0] ?? ""
  const translated = translateSlug(head, target)
  const tail = translated ? [translated, ...rest.slice(1)] : rest

  return ["", target, ...tail].join("/").replace(/\/$/, "")
}

function translateSlug(segment: string, target: Locale) {
  for (const slugs of [
    storySlugs,
    atsSlugs,
    toolsSlugs,
    keywordMatchSlugs,
    jobMarketSlugs,
    companyCheckSlugs,
    interviewQuestionsSlugs,
  ]) {
    if (Object.values(slugs).includes(segment)) {
      return slugs[target]
    }
  }

  return null
}

/**
 * Picks the best supported locale from an Accept-Language header,
 * honouring q-values and falling back to the default locale.
 */
export function negotiateLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) {
    return defaultLocale
  }

  const ranked = acceptLanguage
    .split(",")
    .map((entry) => {
      const [tag, ...params] = entry.trim().split(";")
      const quality = params
        .map((param) => param.trim())
        .find((param) => param.startsWith("q="))
      return {
        language: tag.toLowerCase().split("-")[0],
        quality: quality ? Number(quality.slice(2)) : 1,
      }
    })
    .filter((entry) => entry.language && entry.quality > 0)
    .sort((a, b) => b.quality - a.quality)

  return (
    (ranked.find((entry) => hasLocale(entry.language))?.language as
      Locale | undefined) ?? defaultLocale
  )
}

/** Replaces `{name}` placeholders in dictionary strings. */
export function format(
  template: string,
  values: Record<string, string | number>
) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match
  )
}
