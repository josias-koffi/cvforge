import { Skeleton } from "@/components/ui/skeleton"

export default function OfferLoading() {
  return (
    <div aria-busy className="flex flex-col gap-6" role="status">
      <span className="sr-only">Chargement de l&apos;offre…</span>
      <div className="flex flex-col gap-2 px-4 lg:px-6">
        <Skeleton className="h-7 w-72" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid gap-4 px-4 lg:px-6 @5xl/main:grid-cols-[1fr_380px]">
        <Skeleton className="h-96 rounded-xl" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
