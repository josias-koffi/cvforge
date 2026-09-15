import { Skeleton } from "@/components/ui/skeleton"

export default function AppLoading() {
  return (
    <div aria-busy className="flex flex-col gap-6" role="status">
      <span className="sr-only">Chargement…</span>
      <div className="flex flex-col gap-2 px-4 lg:px-6">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="px-4 lg:px-6">
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  )
}
