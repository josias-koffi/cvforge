import type { InterviewSessionSummary } from "@cvforge/types"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { finishInterview } from "@/app/(app)/entretiens/actions"
import { SessionDetails } from "@/components/interview/session-details"
import { InterviewStudio } from "@/components/interview/studio/interview-studio"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { ApiError, api } from "@/lib/api"
import { profileHints } from "@/lib/interview/labels"

// One route, two states — a finished session is read back here rather than
// resumed, so the title cannot claim an interview is under way.
export const metadata: Metadata = { title: "Entretien" }

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

  // A finished session is read, not resumed. It used to redirect to the
  // report, which left the breadcrumb's "Détail" crumb pointing at the page
  // the candidate was already on.
  if (session.status === "completed") {
    return (
      <>
        <PageHeader
          actions={
            session.report ? (
              <Button asChild>
                <Link href={`/entretiens/${sessionId}/rapport`}>
                  Voir le rapport
                </Link>
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link href="/entretiens">Retour aux entretiens</Link>
              </Button>
            )
          }
          description="L'échange complet, tel qu'il s'est déroulé."
          title="Détail de l'entretien"
        />
        <SessionDetails session={session} />
      </>
    )
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
