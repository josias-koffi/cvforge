"use client"

import { useEffect, useState } from "react"
import { cn } from "cn"

export type OutlineItem = {
  /** The id of the SectionCard it scrolls to. */
  id: string
  label: string
  /** One line under the label: what the section holds. */
  detail: string
  /** Shown as a dot when set: green when filled, muted when still to do. */
  done?: boolean
}

/**
 * The table of contents of a long form, beside it: each section with a line
 * that sums it up, the one being read highlighted as the cards scroll.
 */
export function SectionOutline({
  items,
  label,
}: {
  items: OutlineItem[]
  label: string
}) {
  const active = useVisibleSection(items.map((item) => item.id))

  return (
    <nav aria-label={label}>
      <ol className="flex flex-col gap-1">
        {items.map(({ detail, done, id, label: title }, index) => (
          <li key={id}>
            <a
              href={`#${id}`}
              aria-current={active === id ? "location" : undefined}
              className="flex gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted aria-[current]:bg-muted"
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                  done === undefined
                    ? "bg-muted text-muted-foreground"
                    : done
                      ? "bg-success/15 text-success"
                      : "border border-dashed text-muted-foreground"
                )}
              >
                {index + 1}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-sm font-medium">{title}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {detail}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}

/**
 * The topmost section still on screen — or the last one once the cards are
 * scrolled to the end, since the last sections can never reach the top and a
 * click on them would otherwise highlight the one above.
 */
function useVisibleSection(ids: string[]) {
  const [active, setActive] = useState<string | null>(null)
  const key = ids.join(",")

  useEffect(() => {
    const order = key.split(",")
    const sections = order
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => section !== null)
    const scroller = sections[0]?.parentElement
    const visible = new Set<string>()

    const update = () => {
      const shown = order.filter((id) => visible.has(id))
      const atEnd =
        scroller !== null &&
        scroller !== undefined &&
        scroller.scrollHeight > scroller.clientHeight &&
        scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2

      setActive((atEnd ? shown.at(-1) : shown[0]) ?? null)
    }

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target.id)
        else visible.delete(entry.target.id)
      }
      update()
    })

    for (const section of sections) observer.observe(section)
    scroller?.addEventListener("scroll", update, { passive: true })

    return () => {
      observer.disconnect()
      scroller?.removeEventListener("scroll", update)
    }
  }, [key])

  return active
}
