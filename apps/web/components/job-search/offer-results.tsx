"use client"

import { ArrowDownWideNarrowIcon, XIcon } from "lucide-react"

import { PagePagination } from "@/components/data-table/page-pagination"
import { OfferFiltersSheet } from "@/components/job-search/offer-filters"
import {
  OfferGridSkeleton,
  RESULTS_GRID_COLUMNS,
} from "@/components/job-search/offer-grid-skeleton"
import { useOfferSearch } from "@/components/job-search/offer-search-provider"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { activeFilters, clearedFilters, withFilters } from "@/lib/offer-search"

const numbers = new Intl.NumberFormat("fr-FR")

/** How many offers, what narrows them, and in which order. */
export function OfferResultsHeader({
  available,
  total,
}: {
  available: number
  total: number
}) {
  const { filters, pending, placeName, search } = useOfferSearch()
  const chips = activeFilters(filters, placeName)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <p className="mr-auto flex items-baseline gap-2" aria-live="polite">
          {pending ? (
            <span className="flex items-center gap-2 text-lg font-semibold">
              <Spinner />
              Recherche en cours…
            </span>
          ) : (
            <>
              <span className="text-lg font-semibold">
                {total === 0
                  ? "Aucune offre"
                  : `${numbers.format(total)} offre${total > 1 ? "s" : ""}`}
              </span>
              <span className="text-sm text-muted-foreground">
                sur {numbers.format(available)} en base
              </span>
            </>
          )}
        </p>

        <OfferFiltersSheet />

        <Select
          value={filters.tri === "recent" ? "recent" : "relevance"}
          onValueChange={(value) =>
            search(
              withFilters(filters, {
                tri: value === "recent" ? "recent" : undefined,
              })
            )
          }
        >
          <SelectTrigger
            aria-label="Trier les offres"
            className="data-[size=default]:h-9"
          >
            <ArrowDownWideNarrowIcon />
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="relevance">Les plus pertinentes</SelectItem>
            <SelectItem value="recent">Les plus récentes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {chips.length > 0 ? (
        <ul
          aria-label="Filtres actifs"
          className="flex flex-wrap items-center gap-2"
        >
          {chips.map((chip) => (
            <li key={chip.id}>
              <Button
                size="sm"
                variant="secondary"
                className="h-7 rounded-full pr-2"
                aria-label={`Retirer le filtre ${chip.label}`}
                onClick={() => search(chip.without)}
              >
                {chip.label}
                <XIcon />
              </Button>
            </li>
          ))}
          {chips.length > 1 ? (
            <li>
              <Button
                size="sm"
                variant="link"
                className="h-7"
                onClick={() => search(clearedFilters(filters))}
              >
                Tout effacer
              </Button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  )
}

/**
 * The results, or their outline while a search is on its way. The old
 * offers are not left on screen meanwhile: they are not the answer to what
 * the candidate just asked, and clicking one would open the wrong search.
 */
export function OfferResultsBody({ children }: { children: React.ReactNode }) {
  const { pending } = useOfferSearch()

  return (
    <div aria-busy={pending} className="relative">
      {pending ? (
        <div role="status">
          <span className="sr-only">Recherche des offres en cours…</span>
          <div
            aria-hidden
            className="absolute inset-x-0 -top-2 h-0.5 overflow-hidden rounded-full bg-primary/15"
          >
            <div className="h-full w-1/3 animate-[offer-search-progress_1.1s_ease-in-out_infinite] rounded-full bg-primary" />
          </div>
          <OfferGridSkeleton count={6} columns={RESULTS_GRID_COLUMNS} />
        </div>
      ) : (
        children
      )}
    </div>
  )
}

/** The empty state's way out: drop one criterion, in one click. */
export function OfferEmptySuggestions() {
  const { filters, pending, placeName, search } = useOfferSearch()
  const chips = activeFilters(filters, placeName)

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {chips.map((chip) => (
        <Button
          key={chip.id}
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => search(chip.without)}
        >
          <XIcon />
          Sans {chip.label}
        </Button>
      ))}
    </div>
  )
}

/** The paginator, going through the search so a page change shows the loader. */
export function OfferResultsPagination({
  lastPage,
  page,
}: {
  lastPage: number
  page: number
}) {
  const { filters, search } = useOfferSearch()

  return (
    <PagePagination
      page={page}
      lastPage={lastPage}
      path="/offres"
      params={{ ...filters }}
      onNavigate={(target) =>
        search(withFilters(filters, { page: String(target) }), {
          toResults: true,
        })
      }
    />
  )
}
