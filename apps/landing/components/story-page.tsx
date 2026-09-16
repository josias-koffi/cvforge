import { ZapIcon } from "lucide-react"

import { Reveal } from "@/components/reveal"
import { Section } from "@/components/section"
import { Button } from "@/components/ui/button"
import { getDictionary } from "@/lib/dictionaries"
import type { Locale } from "@/lib/i18n"
import { LOGIN_PATH } from "@/lib/links"

export function StoryPage({ locale }: { locale: Locale }) {
  const { story } = getDictionary(locale)

  return (
    <>
      <Section className="pb-0 md:pb-0">
        <div className="mx-auto max-w-3xl">
          <p className="rise-in text-sm font-medium text-primary">
            {story.eyebrow}
          </p>
          <h1 className="mt-3 rise-in text-4xl font-semibold tracking-tight text-balance md:text-5xl">
            {story.title}
          </h1>
          <blockquote className="mt-10 rise-in border-l-2 border-spark pl-6 text-xl leading-relaxed text-pretty md:text-2xl">
            {story.manifesto}
          </blockquote>
        </div>
      </Section>

      <Section>
        <Reveal className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-semibold tracking-tight">
            {story.originTitle}
          </h2>
          <div className="mt-6 flex flex-col gap-5 text-lg leading-relaxed text-muted-foreground">
            {story.origin.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </Reveal>
      </Section>

      <Section className="border-t bg-card">
        <h2 className="mb-10 text-center text-2xl font-semibold tracking-tight">
          {story.principlesTitle}
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {story.principles.map((principle, index) => (
            <li key={principle.title}>
              <Reveal
                delay={index * 0.06}
                className="h-full rounded-2xl border bg-background p-6"
              >
                <span className="font-mono text-sm text-primary">
                  0{index + 1}
                </span>
                <h3 className="mt-3 text-lg font-medium">{principle.title}</h3>
                <p className="mt-2 text-muted-foreground">{principle.body}</p>
              </Reveal>
            </li>
          ))}
        </ul>
        <div className="mt-12 flex justify-center">
          <Button
            variant="spark"
            size="lg"
            className="h-11 px-6 text-base"
            asChild
          >
            <a href={LOGIN_PATH}>
              <ZapIcon strokeWidth={1.75} />
              {story.cta}
            </a>
          </Button>
        </div>
      </Section>
    </>
  )
}
