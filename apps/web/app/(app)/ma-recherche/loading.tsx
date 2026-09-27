import { Skeleton } from "@/components/ui/skeleton"

/** Under the tabs, which stay: only the tab being opened waits. */
export default function SearchProjectLoading() {
  return (
    <div aria-busy className="flex flex-col gap-4" role="status">
      <span className="sr-only">Chargement…</span>
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  )
}
