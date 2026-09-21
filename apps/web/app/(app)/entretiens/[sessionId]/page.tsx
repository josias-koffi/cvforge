import type { InterviewSessionSummary } from "@cvforge/types"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import { finishInterview } from "@/app/(app)/entretiens/actions"
import { InterviewStudio } from "@/components/interview/studio/interview-studio"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { ApiError, api } from "@/lib/api"
import { profileHints } from "@/lib/interview/labels"

export const metadata: Metadata = { title: "Entretien en cours" }

export default async function InterviewSessionPage({
  params,
}: PageProps<"/entretiens/[sessionId]">) {
  const { sessionId } = await params

  let session: InterviewSessionSummary
  try {
    session = await api<InterviewSessionSummary>(
      `/interviews/sessions/${encodeURIComponent(sessionId)}`
    )
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound()
    throw error
  }

  // Loading the session on the server is what lets a reload resume the
  // interview: there is no client-side copy of the session id to go stale.
  if (session.status === "completed") {
    redirect(`/entretiens/${sessionId}/rapport`)
  }

  return (
    <>
      <PageHeader
        actions={
          <Button asChild variant="outline">
            <Link href="/entretiens">Quitter</Link>
          </Button>
        }
        description={profileHints[session.profile]}
        title="Entretien en cours"
      />
      <div className="px-4 lg:px-6">
        <InterviewStudio
          onFinish={async () => {
            "use server"
            await finishInterview(sessionId)
          }}
          session={session}
        />
      </div>
    </>
  )
}
