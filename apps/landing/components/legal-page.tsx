import type { PublicLegalDocument } from "@cvforge/types"

import { Section } from "@/components/section"
import type { Locale } from "@/lib/i18n"
import { parseLegalBody } from "@/lib/legal"

/**
 * Renders a published document as React elements. The body is parsed into
 * typed blocks and never injected as HTML — see `parseLegalBody`.
 */
export function LegalPage({
  document,
  locale,
  updatedLabel,
}: {
  document: PublicLegalDocument
  locale: Locale
  updatedLabel: string
}) {
  const blocks = parseLegalBody(document.body[locale])
  const updatedOn = new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
  }).format(new Date(document.publishedAt))

  return (
    <Section>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
          {document.title[locale]}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {updatedLabel} {updatedOn}
        </p>

        <div className="mt-12 flex flex-col gap-6">
          {blocks.map((block, index) => {
            if (block.type === "heading") {
              return (
                <h2
                  key={index}
                  className="mt-6 text-xl font-medium tracking-tight"
                >
                  {block.text}
                </h2>
              )
            }

            if (block.type === "list") {
              return (
                <ul
                  key={index}
                  className="flex list-disc flex-col gap-2 pl-5 text-muted-foreground"
                >
                  {block.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )
            }

            return (
              <p key={index} className="text-pretty text-muted-foreground">
                {block.text}
              </p>
            )
          })}
        </div>
      </div>
    </Section>
  )
}
