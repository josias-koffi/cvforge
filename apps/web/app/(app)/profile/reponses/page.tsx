import type { Metadata } from "next"
import type { ScreeningAnswers } from "@cvforge/types"

import { PageHeader } from "@/components/layout/page-header"
import { ScreeningAnswersForm } from "@/components/profile/screening-answers-form"
import { api } from "@/lib/api"

export const metadata: Metadata = { title: "Réponses aux recruteurs" }

/**
 * What the Chrome extension answers when a recruiter's form asks (US-197).
 * Facts already in the profile (city, current job, licences, languages,
 * availability) are not asked again here.
 */
export default async function ScreeningAnswersPage() {
  const { answers } = await api<{ answers: ScreeningAnswers }>(
    "/screening-answers"
  )

  return (
    <>
      <PageHeader
        title="Réponses aux recruteurs"
        description="Les formulaires de candidature posent souvent les mêmes questions. L'extension JobSpark répond avec ce que vous écrivez ici, et vous demande le reste : elle n'invente jamais de réponse."
      />
      <div className="px-4 lg:px-6">
        <ScreeningAnswersForm answers={answers} />
      </div>
    </>
  )
}
