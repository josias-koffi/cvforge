import type { LegalInline, PublicLegalDocument } from "@cvforge/types"

import { Section } from "@/components/section"
import type { Locale } from "@/lib/i18n"
import { parseLegalBody, parseLegalInline } from "@/lib/legal"

const LINK_CLASS =
  "rounded-sm font-medium text-foreground underline underline-offset-4 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"

/** Links, bold and italics inside a block, as React elements. */
function InlineNodes({ nodes }: { nodes: LegalInline[] }) {
  return nodes.map((node, index) => {
    if (node.type === "text") return node.text

    if (node.type === "strong") {
      return (
        <strong key={index} className="font-semibold text-foreground">
          <InlineNodes nodes={node.children} />
        </strong>
      )
    }

    if (node.type === "emphasis") {
      return (
        <em key={index}>
          <InlineNodes nodes={node.children} />
        </em>
      )
    }

    // Another site opens beside the document, which stays where it was read.
    const external = /^https?:\/\//i.test(node.href)

    return (
      <a
        key={index}
        href={node.href}
        className={LINK_CLASS}
        {...(external ? { rel: "noopener noreferrer", target: "_blank" } : {})}
      >
        <InlineNodes nodes={node.children} />
      </a>
    )
  })
}

function Inline({ text }: { text: string }) {
  return <InlineNodes nodes={parseLegalInline(text)} />
}

/**
 * Renders a published document as React elements. The body is parsed into
 * typed blocks and inline runs, and never injected as HTML — see
 * `parseLegalBody` and `parseLegalInline`.
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
              return block.level === 3 ? (
                <h3 key={index} className="mt-2 text-lg font-medium">
                  <Inline text={block.text} />
                </h3>
              ) : (
                <h2
                  key={index}
                  className="mt-6 text-xl font-medium tracking-tight"
                >
                  <Inline text={block.text} />
                </h2>
              )
            }

            if (block.type === "list") {
              const List = block.ordered ? "ol" : "ul"

              return (
                <List
                  key={index}
                  className={`flex flex-col gap-2 pl-5 text-muted-foreground ${block.ordered ? "list-decimal" : "list-disc"}`}
                >
                  {block.items.map((item, itemIndex) => (
                    <li key={itemIndex}>
                      <Inline text={item} />
                    </li>
                  ))}
                </List>
              )
            }

            if (block.type === "quote") {
              return (
                <blockquote
                  key={index}
                  className="border-l-2 pl-4 text-pretty text-muted-foreground italic"
                >
                  <Inline text={block.text} />
                </blockquote>
              )
            }

            if (block.type === "rule") {
              return <hr key={index} className="border-border" />
            }

            return (
              <p key={index} className="text-pretty text-muted-foreground">
                <Inline text={block.text} />
              </p>
            )
          })}
        </div>
      </div>
    </Section>
  )
}
