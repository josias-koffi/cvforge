import { Skeleton } from "@/components/ui/skeleton"

/** Under the tabs, which stay: only the tab being opened waits. */
export default function AgentsLoading() {
  return (
    <div aria-busy className="flex flex-col gap-4 px-4 lg:px-6" role="status">
      <span className="sr-only">Chargement…</span>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  )
}
