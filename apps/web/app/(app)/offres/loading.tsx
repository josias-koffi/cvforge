import {
  OfferGridSkeleton,
  RESULTS_GRID_COLUMNS,
} from "@/components/job-search/offer-grid-skeleton"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * The first visit only: once on the page, a search keeps it and shows its own
 * loader in the results (`OfferResultsBody`).
 */
export default function OfferSearchLoading() {
  return (
    <div aria-busy className="flex flex-col gap-6" role="status">
      <span className="sr-only">Chargement des offres…</span>
      <div className="flex flex-col gap-2 px-4 lg:px-6">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="flex flex-col gap-6 px-4 lg:px-6">
        <Skeleton className="h-15 w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-6 @4xl/main:grid-cols-[15rem_minmax(0,1fr)]">
          <Skeleton className="hidden h-96 rounded-xl @4xl/main:block" />
          <div className="@container/results flex flex-col gap-4">
            <Skeleton className="h-7 w-48" />
            <OfferGridSkeleton count={6} columns={RESULTS_GRID_COLUMNS} />
          </div>
        </div>
      </div>
    </div>
  )
}
