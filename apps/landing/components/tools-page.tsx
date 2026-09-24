import { Reveal } from "@/components/reveal"
import { Section } from "@/components/section"
import { FreeToolGrid } from "@/components/tools/free-tool-grid"
import { getDictionary } from "@/lib/dictionaries"
import type { Locale } from "@/lib/i18n"
import { LOGIN_PATH } from "@/lib/links"

/** The free tools hub, served at /fr/outils and /en/tools (US-135). */
export function ToolsPage({ locale }: { locale: Locale }) {
  const { tools } = getDictionary(locale)

  return (
    <Section className="py-16 md:py-24">
      {/* Its own h1, like the ATS page: a page, not a section of the home. */}
      <Reveal className="mx-auto mb-12 flex max-w-2xl flex-col items-center gap-3 text-center">
        <p className="text-sm font-medium text-primary">{tools.eyebrow}</p>
        <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
          {tools.title}
        </h1>
        <p className="text-lg text-pretty text-muted-foreground">
          {tools.subtitle}
        </p>
      </Reveal>
      <FreeToolGrid locale={locale} tools={tools} />
      <p className="mx-auto mt-12 max-w-xl text-center text-pretty text-muted-foreground">
        {tools.more.body}{" "}
        <a
          href={LOGIN_PATH}
          className="font-medium text-primary underline underline-offset-4 hover:no-underline"
        >
          {tools.more.link}
        </a>
      </p>
    </Section>
  )
}
