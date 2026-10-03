import type { Metadata } from "next"

import { ApplyFromAlert } from "@/components/job-search/apply-from-alert"
import { PageHeader } from "@/components/layout/page-header"

export const metadata: Metadata = { title: "Postuler" }

/** The alert's « Postuler avec Jobspark » (US-167): straight to the tailored CV. */
export default async function ApplyFromAlertPage(
  props: PageProps<"/offres-du-jour/postuler/[jobId]">
) {
  const { jobId } = await props.params

  return (
    <>
      <PageHeader
        title="Postuler avec Jobspark"
        description="Votre candidature et votre CV adapté, sans étape de plus."
      />
      <ApplyFromAlert jobId={decodeURIComponent(jobId)} />
    </>
  )
}
