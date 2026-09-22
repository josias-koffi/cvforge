import { MicIcon, ShieldCheckIcon, TimerIcon, ZapIcon } from "lucide-react"

import { Reveal } from "@/components/reveal"
import { BrowserFrame, Screenshot } from "@/components/screenshot"
import { Section, SectionHeading } from "@/components/section"
import { Button } from "@/components/ui/button"
import type { LandingDictionary } from "@/content/types"
import { LOGIN_PATH } from "@/lib/links"

export function Interview({
  interview,
}: {
  interview: LandingDictionary["interview"]
}) {
  return (
    <Section id="interview" className="border-t bg-card">
      <SectionHeading
        eyebrow={interview.eyebrow}
        title={interview.title}
        subtitle={interview.subtitle}
      />

      <Reveal>
        <BrowserFrame path="/entretiens">
          <Screenshot
            name="interview-studio"
            alt={interview.screenshotAlt}
            sizes="(min-width: 1152px) 1152px, 100vw"
          />
        </BrowserFrame>
      </Reveal>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Reveal delay={0.05} className="lg:col-span-2">
          <article className="h-full rounded-2xl border bg-background p-6">
            <Header icon={MicIcon}>{interview.eyebrow}</Header>
            <ul className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {interview.profiles.map((profile) => (
                <li key={profile.title}>
                  <h3 className="font-medium">{profile.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {profile.body}
                  </p>
                </li>
              ))}
            </ul>
          </article>
        </Reveal>

        <Reveal delay={0.1}>
          <article className="h-full rounded-2xl border bg-background p-6">
            <Header icon={TimerIcon}>{interview.durationsTitle}</Header>
            <ul className="mt-5 flex flex-col gap-3">
              {interview.durations.map((duration) => (
                <li key={duration} className="text-muted-foreground">
                  {duration}
                </li>
              ))}
            </ul>
          </article>
        </Reveal>

        <Reveal delay={0.15} className="lg:col-span-3">
          <article className="grid h-full gap-8 rounded-2xl border bg-background p-6 lg:grid-cols-2 lg:items-center">
            <div>
              <h3 className="text-xl font-medium">{interview.report.title}</h3>
              <p className="mt-2 text-muted-foreground">
                {interview.report.body}
              </p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {interview.report.metrics.map((metric) => (
                  <li
                    key={metric}
                    className="rounded-full border bg-card px-3 py-1 text-sm"
                  >
                    {metric}
                  </li>
                ))}
              </ul>
            </div>
            <div className="overflow-hidden rounded-xl border">
              <Screenshot
                name="interview-report"
                alt={interview.reportScreenshotAlt}
                sizes="(min-width: 1024px) 560px, 100vw"
              />
            </div>
          </article>
        </Reveal>
      </div>

      <div className="mt-10 flex flex-col items-center gap-5">
        <p className="flex max-w-xl items-start gap-2 text-center text-sm text-muted-foreground">
          <ShieldCheckIcon
            className="mt-0.5 size-4 shrink-0"
            strokeWidth={1.75}
            aria-hidden
          />
          {interview.privacyNote}
        </p>
        <Button variant="spark" size="lg" className="h-11 px-6 text-base" asChild>
          <a href={LOGIN_PATH}>
            <ZapIcon strokeWidth={1.75} />
            {interview.cta}
          </a>
        </Button>
      </div>
    </Section>
  )
}

function Header({
  icon: Icon,
  children,
}: {
  icon: typeof MicIcon
  children: string
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-primary">
        <Icon className="size-5" strokeWidth={1.75} aria-hidden />
      </span>
      <h3 className="text-lg font-medium">{children}</h3>
    </div>
  )
}
