import type { ReactNode } from "react"
import {
  ArrowRightIcon,
  Building2Icon,
  FileTextIcon,
  GaugeIcon,
  ListChecksIcon,
  MailIcon,
  MapPinnedIcon,
  MicIcon,
  SunriseIcon,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"

import { Reveal } from "@/components/reveal"
import { Screenshot } from "@/components/screenshot"
import { Section, SectionHeading } from "@/components/section"
import type { FeatureKey } from "@/content/feature-pages/types"
import type { LandingDictionary, ScreenshotName } from "@/content/types"
import { featurePath } from "@/lib/features"
import type { Locale } from "@/lib/i18n"
import { cn } from "@/lib/utils"

type TileKey = keyof LandingDictionary["features"]["items"]

interface BentoTile {
  key: TileKey
  icon: LucideIcon
  className: string
  /** The feature page the tile leads to, when it has one. */
  feature?: FeatureKey
  screenshot?: { name: ScreenshotName; position: string }
}

/** Two tiles per row, the wide one alternating sides (US-147). */
const TILES: BentoTile[] = [
  {
    key: "offers",
    icon: SunriseIcon,
    className: "md:col-span-4",
    feature: "daily_offers",
    screenshot: { name: "job-search", position: "object-[0%_0%]" },
  },
  {
    key: "market",
    icon: MapPinnedIcon,
    className: "md:col-span-2",
    feature: "companies_market",
  },
  {
    key: "tailor",
    icon: FileTextIcon,
    className: "md:col-span-2",
    feature: "tailored_documents",
  },
  {
    key: "ats",
    icon: GaugeIcon,
    className: "md:col-span-4",
    feature: "tailored_documents",
    screenshot: { name: "cv-ats", position: "object-[0%_0%]" },
  },
  {
    key: "interview",
    icon: MicIcon,
    className: "md:col-span-4",
    feature: "interview",
    screenshot: { name: "interview-progress", position: "object-[0%_0%]" },
  },
  {
    key: "letter",
    icon: MailIcon,
    className: "md:col-span-2",
    feature: "tailored_documents",
  },
  {
    key: "companies",
    icon: Building2Icon,
    className: "md:col-span-3",
    feature: "companies_market",
    screenshot: { name: "company-page", position: "object-[100%_0%]" },
  },
  {
    key: "tracking",
    icon: ListChecksIcon,
    className: "md:col-span-3",
    screenshot: { name: "candidatures", position: "object-[0%_0%]" },
  },
]

export function FeaturesBento({
  features,
  locale,
}: {
  features: LandingDictionary["features"]
  locale: Locale
}) {
  return (
    <Section id="features">
      <SectionHeading
        eyebrow={features.eyebrow}
        title={features.title}
        subtitle={features.subtitle}
      />
      <div className="grid gap-4 md:grid-cols-6">
        {TILES.map((tile, index) => {
          const item = features.items[tile.key]
          return (
            <Reveal
              key={tile.key}
              delay={index * 0.05}
              className={tile.className}
            >
              <Tile
                icon={tile.icon}
                title={item.title}
                body={item.body}
                href={tile.feature && featurePath(tile.feature)(locale)}
                learnMore={features.learnMore}
              >
                {tile.screenshot ? (
                  <div className="relative mt-6 -mr-6 -mb-6 h-56 overflow-hidden rounded-tl-xl border-t border-l bg-background md:h-64">
                    <Screenshot
                      name={tile.screenshot.name}
                      alt=""
                      sizes="(min-width: 768px) 700px, 100vw"
                      className={cn(
                        "h-full w-full object-cover",
                        tile.screenshot.position
                      )}
                    />
                  </div>
                ) : null}
              </Tile>
            </Reveal>
          )
        })}
      </div>
    </Section>
  )
}

function Tile({
  icon: Icon,
  title,
  body,
  href,
  learnMore,
  children,
}: {
  icon: LucideIcon
  title: string
  body: string
  href?: string
  learnMore: string
  children?: ReactNode
}) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card p-6 shadow-surface transition-shadow duration-200 ease-spark hover:shadow-raised">
      <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-primary transition-transform duration-200 ease-spark group-hover:-rotate-6">
        <Icon className="size-5" strokeWidth={1.75} aria-hidden />
      </span>
      <h3 className="mt-4 text-lg font-medium">{title}</h3>
      <p className="mt-1 text-muted-foreground">{body}</p>
      {href ? (
        <Link
          href={href}
          className="mt-3 inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 after:absolute after:inset-0 hover:underline focus-visible:outline-none focus-visible:after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-ring"
        >
          {learnMore}
          <span className="sr-only">: {title}</span>
          <ArrowRightIcon
            className="size-4 transition-transform group-hover:translate-x-0.5"
            strokeWidth={1.75}
          />
        </Link>
      ) : null}
      {children ? <div className="mt-auto">{children}</div> : null}
    </article>
  )
}
