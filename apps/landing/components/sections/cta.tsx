import { ZapIcon } from "lucide-react"

import { Reveal } from "@/components/reveal"
import { Button } from "@/components/ui/button"
import type { LandingDictionary } from "@/content/types"
import { atsPath } from "@/lib/ats"
import type { Locale } from "@/lib/i18n"
import { LOGIN_PATH } from "@/lib/links"

export function Cta({
  cta,
  locale,
}: {
  cta: LandingDictionary["cta"]
  locale: Locale
}) {
  return (
    <section className="px-4 pb-20 sm:px-6 md:pb-28">
      <Reveal className="relative isolate mx-auto max-w-6xl overflow-hidden rounded-3xl bg-primary px-6 py-16 text-center text-primary-foreground md:py-20">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_120%,color-mix(in_oklch,var(--spark)_35%,transparent),transparent_60%)]"
        />
        <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-balance md:text-4xl">
          {cta.title}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg opacity-85">{cta.body}</p>
        <Button
          variant="spark"
          size="lg"
          className="mt-8 h-11 px-6 text-base"
          asChild
        >
          <a href={LOGIN_PATH}>
            <ZapIcon strokeWidth={1.75} />
            {cta.button}
          </a>
        </Button>
        {/* Full opacity: at 14 px, 85 % white on the primary falls to about
            4:1, under the 4.5:1 WCAG AA asks for (US-134 review). */}
        <p className="mt-5 text-sm">
          {cta.atsPrompt}{" "}
          <a
            className="rounded-sm font-medium underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-primary-foreground focus-visible:outline-none"
            href={atsPath(locale)}
          >
            {cta.atsLink}
          </a>
        </p>
      </Reveal>
    </section>
  )
}
