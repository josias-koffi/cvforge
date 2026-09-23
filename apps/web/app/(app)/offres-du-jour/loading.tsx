import { OfferGridSkeleton } from "@/components/job-search/offer-grid-skeleton"
import { Skeleton } from "@/components/ui/skeleton"

export default function DailyJobsLoading() {
  return (
    <div aria-busy className="flex flex-col gap-6" role="status">
      <span className="sr-only">Chargement de votre sélection…</span>
      <div className="flex flex-col gap-2 px-4 lg:px-6">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="px-4 lg:px-6">
        <OfferGridSkeleton count={6} />
      </div>
    </div>
  )
}
