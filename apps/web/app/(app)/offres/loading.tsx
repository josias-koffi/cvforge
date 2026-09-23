import { OfferGridSkeleton } from "@/components/job-search/offer-grid-skeleton"
import { Skeleton } from "@/components/ui/skeleton"

export default function OfferSearchLoading() {
  return (
    <div aria-busy className="flex flex-col gap-6" role="status">
      <span className="sr-only">Chargement des offres…</span>
      <div className="flex flex-col gap-2 px-4 lg:px-6">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <Skeleton className="h-10 w-full" />
        <OfferGridSkeleton />
      </div>
    </div>
  )
}
