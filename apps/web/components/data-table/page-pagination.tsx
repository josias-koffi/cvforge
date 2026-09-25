import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { pageHref, paginationSlots } from "@/lib/pagination"

/**
 * Real pagination: numbers, not two arrows.
 *
 * The inactive arrow is `aria-disabled` with the pointer turned off, not
 * `disabled`: that attribute means nothing on a link, and both arrows used to
 * stay clickable — the first page had a working "previous".
 */
export function PagePagination({
  page,
  lastPage,
  params,
  path,
}: {
  page: number
  lastPage: number
  params: Record<string, string | undefined>
  path: string
}) {
  if (lastPage <= 1) return null

  const href = (target: number) => pageHref(path, params, target)
  const atStart = page <= 1
  const atEnd = page >= lastPage

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            text="Précédente"
            href={atStart ? undefined : href(page - 1)}
            aria-disabled={atStart || undefined}
            className={atStart ? "pointer-events-none opacity-50" : undefined}
          />
        </PaginationItem>

        {paginationSlots(page, lastPage).map((slot, index) =>
          slot === "ellipsis" ? (
            <PaginationItem key={`ellipsis-${index}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={slot}>
              <PaginationLink
                href={href(slot)}
                isActive={slot === page}
                aria-label={`Page ${slot}`}
              >
                {slot}
              </PaginationLink>
            </PaginationItem>
          )
        )}

        <PaginationItem>
          <PaginationNext
            text="Suivante"
            href={atEnd ? undefined : href(page + 1)}
            aria-disabled={atEnd || undefined}
            className={atEnd ? "pointer-events-none opacity-50" : undefined}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
