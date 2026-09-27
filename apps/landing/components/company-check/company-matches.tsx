import { ChevronRightIcon } from "lucide-react"
import { headcountLabel, type CompanyCheckMatch } from "@cvforge/types"

import type { CompanyCheckDictionary } from "@/content/company-check/types"
import { format, type Locale } from "@/lib/i18n"

/**
 * The companies a search found (US-139): the town, the NAF code and the
 * headcount of each tell namesakes apart.
 */
export function CompanyMatches({
  dictionary,
  locale,
  matches,
  disabled,
  onOpen,
}: {
  dictionary: CompanyCheckDictionary["results"]
  locale: Locale
  matches: CompanyCheckMatch[]
  disabled: boolean
  onOpen: (siren: string) => void
}) {
  return (
    <section className="mx-auto mt-8 w-full max-w-2xl">
      <h2 className="text-lg font-medium">
        {format(dictionary.title, { count: matches.length })}
      </h2>
      <ul className="mt-3 flex flex-col gap-2">
        {matches.map((match) => (
          <li key={match.siren}>
            <button
              className="flex min-h-11 w-full items-center gap-3 rounded-xl border bg-card px-4 py-3 text-left transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60 motion-reduce:transition-none"
              disabled={disabled}
              onClick={() => onOpen(match.siren)}
              type="button"
            >
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2 font-medium">
                  {match.name}
                  {match.closed ? (
                    <span className="rounded-full border px-2 py-0.5 text-xs font-normal text-muted-foreground">
                      {dictionary.closed}
                    </span>
                  ) : null}
                </span>
                <span className="block text-sm text-muted-foreground">
                  {matchDetails(match, locale).join(" · ")}
                </span>
              </span>
              <ChevronRightIcon
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground"
              />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function matchDetails(match: CompanyCheckMatch, locale: Locale) {
  const place = match.city
    ? `${match.city}${match.postcode ? ` (${match.postcode})` : ""}`
    : ""

  return [
    place,
    match.nafCode ? `NAF ${match.nafCode}` : "",
    headcountLabel(match.headcountBand, locale),
  ].filter(Boolean)
}
