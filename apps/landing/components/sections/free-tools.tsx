import Link from "next/link"

import { Section, SectionHeading } from "@/components/section"
import { FreeToolGrid } from "@/components/tools/free-tool-grid"
import type { LandingDictionary } from "@/content/types"
import type { Locale } from "@/lib/i18n"
import { toolsPath } from "@/lib/tools"

/** The free tools on the home page, for the visitor not ready to sign up (US-135). */
export function FreeTools({
  locale,
  tools,
}: {
  locale: Locale
  tools: LandingDictionary["tools"]
}) {
  return (
    <Section id="free-tools">
      <SectionHeading
        eyebrow={tools.home.eyebrow}
        title={tools.home.title}
        subtitle={tools.home.subtitle}
      />
      <FreeToolGrid locale={locale} tools={tools} />
      <p className="mt-10 text-center">
        <Link
          href={toolsPath(locale)}
          className="font-medium text-primary underline underline-offset-4 hover:no-underline"
        >
          {tools.home.seeAll}
        </Link>
      </p>
    </Section>
  )
}
