import Link from "next/link"
import { ChevronRightIcon } from "lucide-react"

export type Crumb = { name: string; path: string }

/**
 * Where a generated page sits, the page itself last and not linked (US-138,
 * US-140). The same crumbs feed the page's `BreadcrumbList` JSON-LD.
 */
export function Breadcrumbs({
  crumbs,
  label,
}: {
  crumbs: Crumb[]
  label: string
}) {
  return (
    <nav aria-label={label}>
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1

          return (
            <li className="flex items-center gap-1" key={crumb.path}>
              {last ? (
                <span aria-current="page" className="text-foreground">
                  {crumb.name}
                </span>
              ) : (
                <>
                  <Link
                    className="hover:text-foreground hover:underline"
                    href={crumb.path}
                  >
                    {crumb.name}
                  </Link>
                  <ChevronRightIcon aria-hidden="true" className="size-3.5" />
                </>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
