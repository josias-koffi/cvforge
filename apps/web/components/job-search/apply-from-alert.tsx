"use client"

import Link from "next/link"
import { useEffect, useRef, useState, useTransition } from "react"
import { AlertCircleIcon, SparklesIcon } from "lucide-react"

import { applyFromAlert } from "@/app/(app)/offres-du-jour/actions"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Spinner } from "@/components/ui/spinner"

/**
 * Where the alert's « Postuler avec Jobspark » lands (US-167): no screen to
 * click through, the application and the tailored CV start at once.
 *
 * Started from the browser, never from the link itself: a mail scanner that
 * opens the link must not create an application, and only a signed-in
 * candidate reaches this page.
 */
export function ApplyFromAlert({ jobId }: { jobId: string }) {
  const started = useRef(false)
  const [, startApplying] = useTransition()
  const [failure, setFailure] = useState<{
    message: string
    applicationId?: string
  } | null>(null)

  useEffect(() => {
    // Once, even when React runs the effect twice in development.
    if (started.current) return
    started.current = true

    startApplying(async () => {
      // On success the action navigates to the CV; it returns only to fail.
      const result = await applyFromAlert(jobId)
      if (result) setFailure(result)
    })
  }, [jobId])

  if (failure) {
    return (
      <Empty className="mx-4 w-auto border bg-card lg:mx-6">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <AlertCircleIcon />
          </EmptyMedia>
          <EmptyTitle>La candidature n&apos;a pas pu aller au bout</EmptyTitle>
          <EmptyDescription>{failure.message}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row flex-wrap justify-center gap-2">
          {failure.applicationId ? (
            <Button asChild>
              <Link href={`/candidatures/${failure.applicationId}`}>
                Ouvrir la candidature
              </Link>
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link href={`/offres-du-jour?offre=${encodeURIComponent(jobId)}`}>
              Voir l&apos;offre
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <Empty className="mx-4 w-auto border bg-card lg:mx-6" aria-live="polite">
      <EmptyHeader>
        <EmptyMedia
          variant="icon"
          className="bg-primary/10 text-primary motion-safe:animate-float"
        >
          <SparklesIcon />
        </EmptyMedia>
        <EmptyTitle>On prépare votre candidature</EmptyTitle>
        <EmptyDescription>
          Nous vérifions que l&apos;offre est toujours en ligne, créons la
          candidature et écrivons votre CV adapté. Cela prend quelques secondes.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Spinner />
      </EmptyContent>
    </Empty>
  )
}
