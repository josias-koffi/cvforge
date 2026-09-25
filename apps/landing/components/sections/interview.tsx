import { ArrowRightIcon, MicIcon, ShieldCheckIcon, ZapIcon } from "lucide-react"
import Link from "next/link"

import { Reveal } from "@/components/reveal"
import { BrowserFrame, Screenshot } from "@/components/screenshot"
import { Section, SectionHeading } from "@/components/section"
import { Button } from "@/components/ui/button"
import type { LandingDictionary } from "@/content/types"
import { featurePath } from "@/lib/features"
import type { Locale } from "@/lib/i18n"
import { LOGIN_PATH } from "@/lib/links"

export function Interview({
  interview,
  locale,
}: {
  interview: LandingDictionary["interview"]
  locale: Locale
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

      <Reveal delay={0.05} className="mt-6">
        <article className="rounded-2xl border bg-background p-6">
          <Header icon={MicIcon}>{interview.eyebrow}</Header>
          <ul className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-5">
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

      <div className="mt-10 flex flex-col items-center gap-5">
        <p className="flex max-w-xl items-start gap-2 text-center text-sm text-muted-foreground">
          <ShieldCheckIcon
            className="mt-0.5 size-4 shrink-0"
            strokeWidth={1.75}
            aria-hidden
          />
          {interview.privacyNote}
        </p>
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <Button
            variant="spark"
            size="lg"
            className="h-11 px-6 text-base"
            asChild
          >
            <a href={LOGIN_PATH}>
              <ZapIcon strokeWidth={1.75} />
              {interview.cta}
            </a>
          </Button>
          <Link
            href={featurePath("interview")(locale)}
            className="inline-flex items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline"
          >
            {interview.learnMore}
            <ArrowRightIcon className="size-4" strokeWidth={1.75} />
          </Link>
        </div>
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
