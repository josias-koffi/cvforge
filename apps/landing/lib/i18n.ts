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

/** Maps a landing path to its equivalent in another locale. */
export function localizedPath(pathname: string, target: Locale) {
  const [, , ...rest] = pathname.split("/")
  const isStory = Object.values(storySlugs).includes(rest[0] ?? "")
  const tail = isStory ? [storySlugs[target], ...rest.slice(1)] : rest

  return ["", target, ...tail].join("/").replace(/\/$/, "")
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
