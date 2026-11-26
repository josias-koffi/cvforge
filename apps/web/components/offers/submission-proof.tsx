import type { ApplicationSubmission } from "@cvforge/types"
import { CircleAlertIcon, CircleCheckIcon, ExternalLinkIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatDateTime } from "@/lib/format"

/**
 * What the Chrome extension sent and the confirmation it saw (US-198). A
 * sending without confirmation stays "to check": the candidate looks at the
 * recruiter's site or mailbox before counting it as sent.
 */
export function SubmissionProof({
  submissions,
}: {
  submissions: ApplicationSubmission[]
}) {
  if (submissions.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preuve d&apos;envoi</CardTitle>
        <CardDescription>
          Envoyée depuis l&apos;extension JobSpark, avec ce qui a été rempli et la
          page de confirmation du recruteur.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        {submissions.map((submission) => (
          <section key={submission.id} className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {submission.confirmed ? (
                <Badge variant="secondary">
                  <CircleCheckIcon aria-hidden="true" />
                  Envoi confirmé
                </Badge>
              ) : (
                <Badge variant="outline">
                  <CircleAlertIcon aria-hidden="true" />
                  À vérifier : aucune page de confirmation vue
                </Badge>
              )}
              <span className="text-muted-foreground">
                le {formatDateTime(submission.submittedAt)}
              </span>
            </div>
            <dl className="grid gap-1 text-sm">
              <div>
                <dt className="inline font-medium">Formulaire : </dt>
                <dd className="inline break-all">
                  <a
                    className="underline underline-offset-4"
                    href={submission.formUrl}
                    rel="noreferrer noopener"
                    target="_blank"
                  >
                    {new URL(submission.formUrl).host}
                    <ExternalLinkIcon className="ml-1 inline size-3" aria-hidden="true" />
                  </a>
                </dd>
              </div>
              {submission.documents.length > 0 && (
                <div>
                  <dt className="inline font-medium">Documents joints : </dt>
                  <dd className="inline">{submission.documents.join(", ")}</dd>
                </div>
              )}
            </dl>
            {submission.fields.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer font-medium">
                  {submission.fields.length} champ(s) rempli(s)
                </summary>
                <dl className="mt-2 grid gap-1">
                  {submission.fields.map((field, index) => (
                    <div key={`${field.label}-${index}`} className="grid sm:grid-cols-[14rem_1fr] sm:gap-2">
                      <dt className="text-muted-foreground">{field.label}</dt>
                      <dd className="break-words">{field.value || "—"}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            )}
            {submission.hasScreenshot && (
              // eslint-disable-next-line @next/next/no-img-element -- served by our route with the session cookie, not optimisable
              <img
                alt={`Capture de la page ${submission.confirmed ? "de confirmation" : "affichée après l'envoi"}`}
                className="max-h-96 w-full rounded-md border object-contain object-top"
                loading="lazy"
                src={`/api/submissions/${submission.id}/screenshot`}
              />
            )}
          </section>
        ))}
      </CardContent>
    </Card>
  )
}
