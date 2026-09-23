/**
 * The page numbers a paginator shows, and the links behind them.
 *
 * Pure on purpose: the arithmetic is the part that goes wrong (an ellipsis
 * standing for a single page, a window sliding past the last page), and it is
 * testable on its own only if no component is involved.
 */

/** A number to link to, or the gap between two runs of numbers. */
export type PaginationSlot = number | "ellipsis"

/** How many numbers surround the current page before an ellipsis appears. */
const SIBLINGS = 1

export function paginationSlots(page: number, lastPage: number): PaginationSlot[] {
  const current = Math.min(Math.max(page, 1), Math.max(lastPage, 1))
  const pages = new Set<number>([1, lastPage])

  for (let offset = -SIBLINGS; offset <= SIBLINGS; offset += 1) {
    const candidate = current + offset
    if (candidate >= 1 && candidate <= lastPage) pages.add(candidate)
  }

  const sorted = [...pages].sort((left, right) => left - right)
  const slots: PaginationSlot[] = []

  for (const [index, value] of sorted.entries()) {
    const previous = sorted[index - 1]

    // One missing page is written out rather than hidden: an ellipsis that
    // stands for a single number costs the reader a click for nothing.
    if (previous !== undefined && value - previous === 2) slots.push(previous + 1)
    else if (previous !== undefined && value - previous > 2) slots.push("ellipsis")

    slots.push(value)
  }

  return slots
}

/**
 * The link to another page of the same search.
 *
 * Generic over whatever is in the URL instead of listing the known filters:
 * the detail panel stores the open offer in `offre`, and a fixed list would
 * silently drop it — closing the panel on every page change.
 */
export function pageHref(
  path: string,
  params: Record<string, string | undefined>,
  page: number
): string {
  const query = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "page") query.set(key, value)
  }
  if (page > 1) query.set("page", String(page))

  const suffix = query.toString()

  return suffix ? `${path}?${suffix}` : path
}
