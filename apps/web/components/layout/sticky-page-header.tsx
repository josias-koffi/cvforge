"use client"

import { useEffect, useRef } from "react"

/**
 * Keeps the page header at the top of the shell's scrolling area, and tells
 * that area how tall it is (`--page-header-height`): whatever else sticks
 * further down — an editor's toolbar — sits right under it.
 */
export function StickyPageHeader({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const header = ref.current
    const area = header?.parentElement

    if (!header || !area) return

    // Sticky offsets count from inside the area's top padding, which the
    // header covers: what follows sticks at its height minus that padding.
    const observer = new ResizeObserver(() => {
      const padding = parseFloat(getComputedStyle(area).paddingTop) || 0
      area.style.setProperty(
        "--page-header-height",
        `${header.getBoundingClientRect().height - padding}px`
      )
    })
    observer.observe(header)

    return () => {
      observer.disconnect()
      area.style.removeProperty("--page-header-height")
    }
  }, [])

  // Pulled over the shell's top padding, and stuck that far above it, so it
  // sits flush with the edge; pulled over the gap below so the content keeps its spacing but scrolls under an
  // opaque band rather than into a see-through one.
  return (
    <div
      ref={ref}
      className="sticky -top-4 z-30 -mt-4 -mb-4 bg-background pt-4 pb-4 md:-top-6 md:-mt-6 md:pt-6"
    >
      {children}
    </div>
  )
}
