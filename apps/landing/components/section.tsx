import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/** Page section with the landing gutter, max width and vertical rhythm. */
export function Section({
  id,
  className,
  children,
}: {
  id?: string
  className?: string
  children: ReactNode
}) {
  return (
    <section id={id} className={cn("scroll-mt-20 py-20 md:py-28", className)}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">{children}</div>
    </section>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
}: {
  eyebrow: string
  title: string
  subtitle?: string
  align?: "center" | "left"
}) {
  return (
    <div
      className={cn(
        "mb-12 flex max-w-2xl flex-col gap-3 md:mb-16",
        align === "center" && "mx-auto items-center text-center"
      )}
    >
      <p className="text-sm font-medium text-primary">{eyebrow}</p>
      <h2 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
        {title}
      </h2>
      {subtitle ? (
        <p className="text-lg text-pretty text-muted-foreground">{subtitle}</p>
      ) : null}
    </div>
  )
}
