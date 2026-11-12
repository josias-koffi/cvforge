import { Skeleton } from "@/components/ui/skeleton"

/** The grid's columns, by the width of the page's main area. */
export const OFFER_GRID_COLUMNS =
  "grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-3"

/**
 * The grid beside the search's filter column, by the results' own width
 * (`@container/results`): the main area's breakpoints would squeeze three
 * cards next to the column.
 */
export const RESULTS_GRID_COLUMNS =
  "grid grid-cols-1 gap-4 @xl/results:grid-cols-2 @5xl/results:grid-cols-3"

/** The grid's shape while the offers load — same columns, so nothing jumps. */
export function OfferGridSkeleton({
  count = 9,
  columns = OFFER_GRID_COLUMNS,
}: {
  count?: number
  /** Another set of grid classes, for a grid that shares its row. */
  columns?: string
}) {
  return (
    <div className={columns}>
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className="h-64 rounded-xl" />
      ))}
    </div>
  )
}
