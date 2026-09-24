import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import type { InterviewQuestion } from "@cvforge/types"

import { InterviewQuestionsResult } from "@/components/interview-questions/interview-questions-result"
import { InterviewQuestionsTool } from "@/components/interview-questions/interview-questions-tool"
import { en } from "@/content/en"
import { fr } from "@/content/fr"

const QUESTIONS: InterviewQuestion[] = [
  {
    intent: "Vérifier qu'il connaît le poste.",
    kind: "motivation",
    question: "Pourquoi ce poste de chef de projet digital ?",
  },
  {
    intent: "Mesurer son expérience de pilotage.",
    kind: "experience",
    question: "Racontez une refonte que vous avez pilotée.",
  },
  {
    intent: "Juger sa maîtrise de Scrum.",
    kind: "technical",
    question: "Comment animez-vous une rétrospective ?",
  },
  {
    intent: "Voir comment il gère un conflit.",
    kind: "behavioral",
    question: "Parlez-moi d'un désaccord avec un développeur.",
  },
  {
    intent: "Savoir arbitrer sous contrainte.",
    kind: "situational",
    question: "Le budget est dépassé de 20 % : que faites-vous ?",
  },
]

const escapeHtml = (text: string) =>
  text.replaceAll("'", "&#x27;").replaceAll('"', "&quot;")

function renderResult(dict = fr) {
  return renderToStaticMarkup(
    <InterviewQuestionsResult
      dictionary={dict.interviewQuestions}
      errors={dict.ats}
      offerText="offre"
      onCtaClick={vi.fn()}
      onLeadSent={vi.fn()}
      onRestart={vi.fn()}
      questions={QUESTIONS}
    />
  )
}

describe("InterviewQuestionsTool", () => {
  it.each([
    ["fr", fr],
    ["en", en],
  ] as const)("asks for the offer, in %s", (locale, dict) => {
    const html = renderToStaticMarkup(
      <InterviewQuestionsTool
        dictionary={dict.interviewQuestions}
        errors={dict.ats}
        locale={locale}
      />
    )

    expect(html).toContain(escapeHtml(dict.interviewQuestions.offer.label))
    expect(html).toContain(escapeHtml(dict.interviewQuestions.privacyNote))
    expect(html).toContain("0 / 200")
    // Nothing to send yet: the button waits for the offer.
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>/)
    expect(html).toContain('role="status"')
  })

  it("ties the offer field to its hint and its counter", () => {
    const html = renderToStaticMarkup(
      <InterviewQuestionsTool
        dictionary={fr.interviewQuestions}
        errors={fr.ats}
        locale="fr"
      />
    )
    const describedBy = html.match(
      /<textarea[^>]*aria-describedby="([^"]+)"/
    )?.[1]

    expect(describedBy?.split(" ")).toHaveLength(2)
    expect(html).toContain('maxLength="8000"')
  })
})

describe("InterviewQuestionsResult", () => {
  it("lists the five questions in order, each with its kind and intent", () => {
    const html = renderResult()
    const items = html.match(/<li/g) ?? []

    expect(html).toContain("<ol")
    expect(items).toHaveLength(5)
    for (const question of QUESTIONS) {
      expect(html).toContain(escapeHtml(question.question))
      expect(html).toContain(escapeHtml(question.intent))
      expect(html).toContain(fr.interviewQuestions.result.kinds[question.kind])
    }
    expect(html.indexOf(escapeHtml(QUESTIONS[0]!.question))).toBeLessThan(
      html.indexOf(escapeHtml(QUESTIONS[4]!.question))
    )
  })

  it("announces the result and can take the focus", () => {
    const html = renderResult()

    expect(html).toContain('aria-live="polite"')
    expect(html).toContain('tabindex="-1"')
  })

  it.each([
    ["fr", fr],
    ["en", en],
  ] as const)("leads to the voice interview, in %s", (_locale, dict) => {
    const html = renderResult(dict)

    expect(html).toContain(escapeHtml(dict.interviewQuestions.cta.button))
    expect(html).toContain(escapeHtml(dict.interviewQuestions.result.again))
    expect(html).toContain(escapeHtml(dict.interviewQuestions.result.intro))
  })

  it("names the promised button as the sprint asked", () => {
    expect(fr.interviewQuestions.cta.button).toBe(
      "S'entraîner à l'oral avec un recruteur IA"
    )
  })
})
