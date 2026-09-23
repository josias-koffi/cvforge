import { Skeleton } from "@/components/ui/skeleton"

/** The grid's shape while the offers load — same columns, so nothing jumps. */
export function OfferGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className="h-44 rounded-xl" />
      ))}
    </div>
  )
}
