import type { DraftApplication } from "@cvforge/types"
import type { Metadata } from "next"

import { InterviewSetupForm } from "@/components/interview/interview-setup-form"
import { PageHeader } from "@/components/layout/page-header"
import { api } from "@/lib/api"
import { preselectedApplicationId } from "@/lib/interview/preselection"

export const metadata: Metadata = { title: "Nouvel entretien" }

export default async function NewInterviewPage({
  searchParams,
}: PageProps<"/entretiens/new">) {
  const [{ applications }, query] = await Promise.all([
    api<{ applications: DraftApplication[] }>("/applications"),
    searchParams,
  ])

  // `?candidature=` lets the candidature page, and the interview questions'
  // magic link, send the user straight here with the offer already chosen.
  const preselected = preselectedApplicationId(query.candidature, applications)

  return (
    <>
      <PageHeader
        description="Un recruteur qui vous répond à l'oral, et un rapport à la fin."
        title="Nouvel entretien"
      />
      <div className="max-w-3xl px-4 lg:px-6">
        <InterviewSetupForm
          applications={applications}
          defaultApplicationId={preselected}
        />
      </div>
    </>
  )
}
