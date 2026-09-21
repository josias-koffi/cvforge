"use client"

import {
  interviewRecruiterProfiles,
  supportedLocales,
  type DraftApplication,
  type InterviewRecruiterProfile,
  type Locale,
} from "@cvforge/types"
import { useRouter } from "next/navigation"
import * as React from "react"
import { AlertCircleIcon, MicIcon } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { creditCostLabel } from "@/lib/format"
import { startSession } from "@/lib/interview/client"
import {
  languageLabels,
  profileHints,
  profileLabels,
} from "@/lib/interview/labels"
import { cn } from "@/lib/utils"

const FREE_PRACTICE = "free"

function describeApplication(application: DraftApplication) {
  const company = application.extracted.companyName

  return company
    ? `${application.extracted.title} — ${company}`
    : application.extracted.title
}

/**
 * Chooses what the interview is about before spending credits on it: which
 * application, which recruiter, which language.
 *
 * Not a server action: the studio needs the new session id to navigate to,
 * and an action would revalidate the router on the way.
 */
export function InterviewSetupForm({
  applications,
  defaultApplicationId,
}: {
  applications: DraftApplication[]
  defaultApplicationId?: string
}) {
  const router = useRouter()
  const [applicationId, setApplicationId] = React.useState(
    defaultApplicationId && applications.some((a) => a.id === defaultApplicationId)
      ? defaultApplicationId
      : FREE_PRACTICE
  )
  const [profile, setProfile] =
    React.useState<InterviewRecruiterProfile>("standard")
  const [language, setLanguage] = React.useState<Locale>("fr")
  const [error, setError] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    startTransition(async () => {
      try {
        const { sessionId } = await startSession({
          applicationId:
            applicationId === FREE_PRACTICE ? undefined : applicationId,
          language,
          profile,
        })

        router.push(`/entretiens/${sessionId}`)
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Impossible de démarrer l'entretien."
        )
      }
    })
  }

  return (
    <form onSubmit={submit}>
      <Card>
        <CardHeader>
          <CardTitle>Préparer la session</CardTitle>
          <CardDescription>
            Le recruteur s&apos;adapte à l&apos;offre choisie et au style que
            vous voulez travailler. {creditCostLabel("interview_session")}.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="application">Candidature</FieldLabel>
              <Select
                onValueChange={setApplicationId}
                value={applicationId}
                name="application"
              >
                <SelectTrigger id="application">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FREE_PRACTICE}>
                    Entraînement libre (sans offre)
                  </SelectItem>
                  {applications.map((application) => (
                    <SelectItem key={application.id} value={application.id}>
                      {describeApplication(application)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>
                Avec une offre liée, les questions et le rapport tiennent compte
                du poste visé.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel>Style du recruteur</FieldLabel>
              <div
                className="grid gap-2 @2xl/main:grid-cols-2"
                role="radiogroup"
                aria-label="Style du recruteur"
              >
                {interviewRecruiterProfiles.map((candidate) => (
                  <button
                    aria-checked={profile === candidate}
                    className={cn(
                      "rounded-lg border p-3 text-left transition-colors",
                      profile === candidate
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted"
                    )}
                    key={candidate}
                    onClick={() => setProfile(candidate)}
                    role="radio"
                    type="button"
                  >
                    <span className="block text-sm font-medium">
                      {profileLabels[candidate]}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {profileHints[candidate]}
                    </span>
                  </button>
                ))}
              </div>
            </Field>

            <Field>
              <FieldLabel htmlFor="language">Langue</FieldLabel>
              <Select
                onValueChange={(value) => setLanguage(value as Locale)}
                value={language}
                name="language"
              >
                <SelectTrigger className="w-48" id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {supportedLocales.map((locale) => (
                    <SelectItem key={locale} value={locale}>
                      {languageLabels[locale]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {error ? (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
          </FieldGroup>
        </CardContent>

        <CardFooter>
          <Button disabled={pending} type="submit">
            <MicIcon />
            {pending ? "Démarrage…" : "Démarrer l'entretien"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
