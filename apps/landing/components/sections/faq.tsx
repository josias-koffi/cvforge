import { ArrowRightIcon, ChevronDownIcon } from "lucide-react"
import Link from "next/link"

import { Section, SectionHeading } from "@/components/section"
import type { LandingDictionary } from "@/content/types"
import { atsPath } from "@/lib/ats"
import type { Locale } from "@/lib/i18n"

/**
 * Native <details> rather than the Radix accordion: Radix only renders an
 * answer once it is opened, so the answers — and the link to the ATS check —
 * never reached the server HTML search engines read. `name` keeps a single
 * answer open at a time.
 */
export function Faq({
  faq,
  locale,
}: {
  faq: LandingDictionary["faq"]
  locale: Locale
}) {
  return (
    <Section id="faq">
      <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
        <SectionHeading eyebrow={faq.eyebrow} title={faq.title} align="left" />
        <div className="flex w-full flex-col">
          {faq.items.map((item) => (
            <details
              key={item.question}
              name="faq"
              className="group not-last:border-b"
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 rounded-lg py-2.5 text-base font-medium outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
                {item.question}
                <ChevronDownIcon
                  aria-hidden
                  className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                />
              </summary>
              <div className="pb-2.5 text-base text-muted-foreground">
                <p>{item.answer}</p>
                {item.atsCheckLink ? (
                  <Link
                    href={atsPath(locale)}
                    className="mt-3 inline-flex items-center gap-1.5 font-medium text-primary underline-offset-3 hover:underline"
                  >
                    {item.atsCheckLink}
                    <ArrowRightIcon className="size-4" strokeWidth={1.75} />
                  </Link>
                ) : null}
              </div>
            </details>
          ))}
        </div>
      </div>
    </Section>
  )
}
