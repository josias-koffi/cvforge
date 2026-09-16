import { en } from "@/content/en"
import { fr } from "@/content/fr"
import type { LandingDictionary } from "@/content/types"
import type { Locale } from "@/lib/i18n"

const dictionaries: Record<Locale, LandingDictionary> = { fr, en }

/** Kept apart from lib/i18n so client components don't bundle every dictionary. */
export function getDictionary(locale: Locale): LandingDictionary {
  return dictionaries[locale]
}
