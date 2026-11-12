/**
 * The criteria of the offer search (/offres), as the URL holds them.
 *
 * Pure on purpose: the search bar, the filter column, the active-filter chips,
 * the empty state and the paginator all turn criteria into a link, and they
 * must agree on it — a filter that one of them forgets is a filter that
 * silently disappears.
 */
import type { OfferSearchFilters } from "@/lib/job-search"
import { CONTRACT_LABELS } from "@/lib/job-labels"

export const OFFER_SEARCH_PATH = "/offres"

/** The id of the results section, scrolled back to on a page change. */
export const OFFER_RESULTS_ID = "offer-results"

/** The contracts a candidate can tick, in the order a French candidate expects. */
export const CONTRACT_FILTERS = [
  "cdi",
  "cdd",
  "interim",
  "alternance",
  "stage",
  "freelance",
  "vie",
] as const

/** "Publiée depuis" (US-167), in days, as the API reads it. */
export const PUBLISHED_WITHIN = [
  { id: "1", label: "24 h", chip: "Moins de 24 h" },
  { id: "3", label: "3 j", chip: "Moins de 3 jours" },
  { id: "7", label: "7 j", chip: "Moins de 7 jours" },
] as const

/** The radii around a city, in km, as the API accepts them. */
export const SEARCH_RADII_KM = [10, 20, 30, 50, 100] as const
export const DEFAULT_RADIUS_KM = 20

/** How far back the API looks when no "publiée depuis" is chosen. */
export const DEFAULT_WINDOW_DAYS = 90

/** The order the parameters are written in, so a search has one URL. */
const KEYS = [
  "q",
  "ville",
  "rayon",
  "departement",
  "contrat",
  "teletravail",
  "publiee",
  "tri",
  "page",
] as const satisfies readonly (keyof OfferSearchFilters)[]

export function offerSearchHref(filters: OfferSearchFilters): string {
  const query = new URLSearchParams()

  for (const key of KEYS) {
    const value = filters[key]?.trim()

    if (!value) continue
    if (key === "page" && Number(value) <= 1) continue
    query.set(key, value)
  }

  const suffix = query.toString()

  return suffix ? `${OFFER_SEARCH_PATH}?${suffix}` : OFFER_SEARCH_PATH
}

/**
 * The criteria with some changed. Changing a criterion goes back to the first
 * page: page 4 of another search is a page nobody asked for.
 */
export function withFilters(
  filters: OfferSearchFilters,
  patch: Partial<OfferSearchFilters>
): OfferSearchFilters {
  const next: OfferSearchFilters = { ...filters, ...patch }

  if (!("page" in patch)) delete next.page
  // A radius around no city means nothing.
  if (!next.ville) delete next.rayon
  for (const key of KEYS) if (!next[key]) delete next[key]

  return next
}

export function contractsOf(filters: OfferSearchFilters): string[] {
  return (filters.contrat ?? "").split(",").filter(Boolean)
}

export function toggleContract(
  filters: OfferSearchFilters,
  contract: string
): OfferSearchFilters {
  const current = contractsOf(filters)
  const next = current.includes(contract)
    ? current.filter((entry) => entry !== contract)
    : [...current, contract]

  return withFilters(filters, { contrat: next.join(",") })
}

/** One criterion narrowing the search, and the search without it. */
export interface ActiveFilter {
  id: string
  label: string
  without: OfferSearchFilters
}

/**
 * What is narrowing the search, one removable chip each. The sort is not
 * one: it orders the offers, it does not hide any.
 */
export function activeFilters(
  filters: OfferSearchFilters,
  /** The name of the city in `ville`, which the URL does not hold. */
  placeName?: string
): ActiveFilter[] {
  const chips: ActiveFilter[] = []
  const q = filters.q?.trim()
  const departement = filters.departement?.trim()

  if (q) {
    chips.push({
      id: "q",
      label: `« ${q} »`,
      without: withFilters(filters, { q: undefined }),
    })
  }
  if (filters.ville) {
    chips.push({
      id: "ville",
      label: `${placeName ?? "Ville"} · ${filters.rayon ?? DEFAULT_RADIUS_KM} km`,
      without: withFilters(filters, { rayon: undefined, ville: undefined }),
    })
  }
  if (departement) {
    chips.push({
      id: "departement",
      label: `Département ${departement}`,
      without: withFilters(filters, { departement: undefined }),
    })
  }
  for (const contract of contractsOf(filters)) {
    chips.push({
      id: `contrat-${contract}`,
      label: CONTRACT_LABELS[contract] ?? contract,
      without: toggleContract(filters, contract),
    })
  }
  if (filters.teletravail === "1") {
    chips.push({
      id: "teletravail",
      label: "Télétravail",
      without: withFilters(filters, { teletravail: undefined }),
    })
  }

  const published = PUBLISHED_WITHIN.find(
    (option) => option.id === filters.publiee
  )

  if (published) {
    chips.push({
      id: "publiee",
      label: published.chip,
      without: withFilters(filters, { publiee: undefined }),
    })
  }

  return chips
}

/** The criteria with nothing narrowing them, the sort kept. */
export function clearedFilters(
  filters: OfferSearchFilters
): OfferSearchFilters {
  return filters.tri ? { tri: filters.tri } : {}
}
