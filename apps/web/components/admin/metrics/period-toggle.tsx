"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "cn"

import { usePeriod } from "@/components/admin/metrics/use-period"
import { toggleVariants } from "@/components/ui/toggle"
import { periodLabels, PERIODS, withPeriod } from "@/lib/admin-metrics/period"

/**
 * The period switch. Links rather than a ToggleGroup: the period is part of
 * the URL, so each choice is a navigation the server renders — and one the
 * back button undoes.
 */
export function PeriodToggle() {
  const pathname = usePathname()
  const current = usePeriod()

  return (
    <nav aria-label="Période" className="flex flex-wrap gap-1">
      {PERIODS.map((period) => {
        const active = period === current

        return (
          <Link
            key={period}
            aria-current={active ? "true" : undefined}
            className={cn(
              toggleVariants({ size: "sm", variant: "outline" }),
              active && "bg-muted text-foreground"
            )}
            data-state={active ? "on" : "off"}
            href={withPeriod(pathname, period)}
            scroll={false}
          >
            {periodLabels[period]}
          </Link>
        )
      })}
    </nav>
  )
}
