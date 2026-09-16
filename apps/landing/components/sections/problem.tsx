import { CheckIcon, XIcon } from "lucide-react"

import { Reveal } from "@/components/reveal"
import { Section, SectionHeading } from "@/components/section"
import type { LandingDictionary } from "@/content/types"
import { cn } from "@/lib/utils"

export function Problem({
  problem,
}: {
  problem: LandingDictionary["problem"]
}) {
  return (
    <Section>
      <SectionHeading
        eyebrow={problem.eyebrow}
        title={problem.title}
        subtitle={problem.body}
      />
      <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-2">
        <Reveal>
          <ComparisonCard
            label={problem.before.label}
            items={problem.before.items}
          />
        </Reveal>
        <Reveal delay={0.1}>
          <ComparisonCard
            label={problem.after.label}
            items={problem.after.items}
            positive
          />
        </Reveal>
      </div>
    </Section>
  )
}

function ComparisonCard({
  label,
  items,
  positive = false,
}: {
  label: string
  items: string[]
  positive?: boolean
}) {
  const Icon = positive ? CheckIcon : XIcon

  return (
    <div
      className={cn(
        "h-full rounded-2xl border bg-card p-6 md:p-8",
        positive ? "border-primary/40 shadow-raised" : "shadow-surface"
      )}
    >
      <p
        className={cn(
          "mb-5 text-sm font-medium",
          positive ? "text-primary" : "text-muted-foreground"
        )}
      >
        {label}
      </p>
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-3">
            <span
              className={cn(
                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                positive
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <Icon className="size-3" strokeWidth={2} aria-hidden />
            </span>
            <span
              className={positive ? "text-foreground" : "text-muted-foreground"}
            >
              {item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
