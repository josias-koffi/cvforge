import { Skeleton } from "@/components/ui/skeleton"

/** Tile count of the KPI row placeholder, one row on a wide screen. */
const KPI_PLACEHOLDERS = 6

/** Under the tabs and the period switch, which stay: only the figures wait. */
export default function MetricsLoading() {
  return (
    <div aria-busy className="flex flex-col gap-4 px-4 lg:px-6" role="status">
      <span className="sr-only">Chargement des indicateurs…</span>
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
        {Array.from({ length: KPI_PLACEHOLDERS }, (_, index) => (
          <Skeleton key={index} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 @3xl/main:grid-cols-2">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  )
}
