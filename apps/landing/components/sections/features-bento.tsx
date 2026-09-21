import type { ReactNode } from "react"
import {
  FileDownIcon,
  FileTextIcon,
  LanguagesIcon,
  ListChecksIcon,
  MailIcon,
  MicIcon,
  UploadIcon,
  type LucideIcon,
} from "lucide-react"

import { Reveal } from "@/components/reveal"
import { Screenshot } from "@/components/screenshot"
import { Section, SectionHeading } from "@/components/section"
import type { LandingDictionary, ScreenshotName } from "@/content/types"
import { cn } from "@/lib/utils"

type FeatureKey = keyof LandingDictionary["features"]["items"]

interface BentoTile {
  key: FeatureKey
  icon: LucideIcon
  className: string
  screenshot?: { name: ScreenshotName; position: string }
}

const TILES: BentoTile[] = [
  {
    key: "tailor",
    icon: FileTextIcon,
    className: "md:col-span-4",
    screenshot: { name: "cv-editor", position: "object-[100%_0%]" },
  },
  { key: "import", icon: UploadIcon, className: "md:col-span-2" },
  { key: "letter", icon: MailIcon, className: "md:col-span-2" },
  {
    key: "tracking",
    icon: ListChecksIcon,
    className: "md:col-span-4",
    screenshot: { name: "candidatures", position: "object-[0%_0%]" },
  },
  {
    key: "interview",
    icon: MicIcon,
    className: "md:col-span-4",
    screenshot: { name: "interview-report", position: "object-[0%_0%]" },
  },
  { key: "export", icon: FileDownIcon, className: "md:col-span-2" },
  {
    key: "translate",
    icon: LanguagesIcon,
    className: "md:col-span-6",
    screenshot: { name: "translate", position: "object-center" },
  },
]

export function FeaturesBento({
  features,
}: {
  features: LandingDictionary["features"]
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
              <Tile icon={tile.icon} title={item.title} body={item.body}>
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
  children,
}: {
  icon: LucideIcon
  title: string
  body: string
  children?: ReactNode
}) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-card p-6 shadow-surface transition-shadow duration-200 ease-spark hover:shadow-raised">
      <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-primary transition-transform duration-200 ease-spark group-hover:-rotate-6">
        <Icon className="size-5" strokeWidth={1.75} aria-hidden />
      </span>
      <h3 className="mt-4 text-lg font-medium">{title}</h3>
      <p className="mt-1 text-muted-foreground">{body}</p>
      {children ? <div className="mt-auto">{children}</div> : null}
    </article>
  )
}
