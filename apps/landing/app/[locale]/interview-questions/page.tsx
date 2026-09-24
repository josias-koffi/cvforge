import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { InterviewQuestionsTool } from "@/components/interview-questions/interview-questions-tool"
import { Reveal } from "@/components/reveal"
import { Section } from "@/components/section"
import { getDictionary } from "@/lib/dictionaries"
import { hasLocale } from "@/lib/i18n"
import { pageMetadata } from "@/lib/seo"
import { interviewQuestionsPath } from "@/lib/tools"

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/interview-questions">): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(locale)) {
    return {}
  }
  const { interviewQuestions } = getDictionary(locale)

  return {
    title: interviewQuestions.metaTitle,
    ...pageMetadata({
      locale,
      title: interviewQuestions.metaTitle,
      description: interviewQuestions.metaDescription,
      path: interviewQuestionsPath,
    }),
  }
}

/**
 * The free "likely interview questions" tool (US-141). Served at
 * /en/interview-questions and, through a rewrite in next.config, at
 * /fr/questions-entretien.
 */
export default async function Page({
  params,
}: PageProps<"/[locale]/interview-questions">) {
  const { locale } = await params
  if (!hasLocale(locale)) {
    notFound()
  }

  const { ats, interviewQuestions } = getDictionary(locale)

  return (
    <Section className="py-16 md:py-24">
      <Reveal className="mx-auto mb-10 flex max-w-2xl flex-col items-center gap-3 text-center">
        <p className="text-sm font-medium text-primary">
          {interviewQuestions.eyebrow}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
          {interviewQuestions.title}
        </h1>
        <p className="text-lg text-pretty text-muted-foreground">
          {interviewQuestions.subtitle}
        </p>
      </Reveal>
      <Reveal delay={0.1}>
        <InterviewQuestionsTool
          dictionary={interviewQuestions}
          errors={ats}
          locale={locale}
        />
      </Reveal>
    </Section>
  )
}
