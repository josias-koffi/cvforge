import { ArrowRightIcon } from "lucide-react"
import Link from "next/link"

import { Reveal } from "@/components/reveal"
import type { LandingDictionary } from "@/content/types"
import type { Locale } from "@/lib/i18n"
import { freeTools } from "@/lib/tools"
import { cn } from "@/lib/utils"

/**
 * The live free tools as cards, shared by the hub and the home section.
 *
 * Each card is one link, stretched from its title: a single tab stop whose
 * accessible name is the tool's name, rather than a card and a button that
 * both lead to the same page.
 */
export function FreeToolGrid({
  locale,
  tools,
}: {
  locale: Locale
  tools: LandingDictionary["tools"]
}) {
  return (
    <ul
      className={cn(
        "grid gap-6 sm:grid-cols-2 lg:grid-cols-3",
        // A lone card sits in the middle rather than against an empty grid.
        freeTools.length === 1 &&
          "mx-auto max-w-md sm:grid-cols-1 lg:grid-cols-1"
      )}
    >
      {freeTools.map(({ key, path, icon: Icon }, index) => {
        const item = tools.items[key]

        return (
          <li key={key}>
            <Reveal
              delay={index * 0.08}
              className="relative flex h-full flex-col gap-4 rounded-xl border bg-card p-6 shadow-surface transition-colors focus-within:ring-2 focus-within:ring-ring hover:border-primary/40"
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon
                  aria-hidden="true"
                  className="size-5"
                  strokeWidth={1.75}
                />
              </span>
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-medium">
                  <Link
                    href={path(locale)}
                    className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none"
                  >
                    {item.name}
                  </Link>
                </h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
              <ul className="flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-full border px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
              <span
                aria-hidden="true"
                className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary"
              >
                {tools.open}
                <ArrowRightIcon className="size-4" strokeWidth={1.75} />
              </span>
            </Reveal>
          </li>
        )
      })}
    </ul>
  )
}
