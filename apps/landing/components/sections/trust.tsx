import {
  BadgeCheckIcon,
  LandmarkIcon,
  MicOffIcon,
  ShieldCheckIcon,
  type LucideIcon,
} from "lucide-react"

import { Reveal } from "@/components/reveal"
import { Section, SectionHeading } from "@/components/section"
import type { LandingDictionary } from "@/content/types"

/** One icon per item, in the dictionary's order. */
const ICONS: LucideIcon[] = [
  ShieldCheckIcon,
  LandmarkIcon,
  MicOffIcon,
  BadgeCheckIcon,
]

/** Why a CV and a job search can be trusted to the product (US-147). */
export function Trust({ trust }: { trust: LandingDictionary["trust"] }) {
  return (
    <Section className="py-16 md:py-20">
      <SectionHeading eyebrow={trust.eyebrow} title={trust.title} />
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {trust.items.map((item, index) => {
          const Icon = ICONS[index] ?? ShieldCheckIcon

          return (
            <li key={item.title}>
              <Reveal delay={index * 0.05} className="flex flex-col gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg border bg-card text-success">
                  <Icon className="size-5" strokeWidth={1.75} aria-hidden />
                </span>
                <h3 className="font-medium">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.body}</p>
              </Reveal>
            </li>
          )
        })}
      </ul>
    </Section>
  )
}
