"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { CircleAlertIcon, MessagesSquareIcon } from "lucide-react"
import type { InterviewQuestion } from "@cvforge/types"

import {
  SparkPending,
  sparkPendingClassName,
} from "@/components/ats/spark-pending"
import { InterviewQuestionsResult } from "@/components/interview-questions/interview-questions-result"
import {
  OfferTextField,
  offerTextReady,
} from "@/components/tools/offer-text-field"
import { Button } from "@/components/ui/button"
import type { InterviewQuestionsDictionary } from "@/content/interview-questions/types"
import type { LandingDictionary } from "@/content/types"
import { scanErrorMessage } from "@/lib/ats-client"
import { toolFunnel } from "@/lib/ats-funnel"
import type { Locale } from "@/lib/i18n"
import { postInterviewQuestions } from "@/lib/interview-questions-client"
import { cn } from "@/lib/utils"

/**
 * The free "likely interview questions" tool (US-141): an offer in, the five
 * questions a recruiter would most likely ask out. One model call, nothing
 * kept.
 */
export function InterviewQuestionsTool({
  dictionary,
  errors,
  locale,
}: {
  dictionary: InterviewQuestionsDictionary
  /** Every free tool's refusals are worded in one place. */
  errors: LandingDictionary["ats"]
  locale: Locale
}) {
  const [offerText, setOfferText] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [questions, setQuestions] = useState<InterviewQuestion[] | null>(null)

  const resultRef = useRef<HTMLDivElement>(null)
  const funnel = useMemo(
    () => toolFunnel("interview_questions", locale),
    [locale]
  )

  // Counted once per visitor and day by the API (US-131).
  useEffect(() => {
    funnel.viewed()
  }, [funnel])

  // The questions replace the form: move the reader to them once mounted.
  useEffect(() => {
    if (questions) resultRef.current?.focus()
  }, [questions])

  const ready = offerTextReady(offerText) && !busy

  async function generate() {
    if (!ready) return

    setBusy(true)
    setError(null)

    try {
      const response = await postInterviewQuestions(offerText.trim(), locale)
      setQuestions(response.questions)
      funnel.scanned()
    } catch (caught) {
      setError(scanErrorMessage(caught, errors))
    } finally {
      setBusy(false)
    }
  }

  if (questions) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <InterviewQuestionsResult
          dictionary={dictionary}
          errors={errors}
          offerText={offerText.trim()}
          onCtaClick={funnel.ctaClicked}
          onLeadSent={funnel.emailSubmitted}
          onRestart={() => setQuestions(null)}
          questions={questions}
          ref={resultRef}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl rounded-2xl border bg-card p-6 shadow-raised md:p-8">
      <OfferTextField
        disabled={busy}
        labels={dictionary.offer}
        onChange={setOfferText}
        value={offerText}
      />

      <p aria-live="polite" className="text-sm text-destructive" role="status">
        {/* Kept mounted and empty: a live region that appears with its
            message is often not read out. */}
        {error ? (
          <span className="mt-3 flex animate-rise-in items-start gap-1.5">
            <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />
            {error}
          </span>
        ) : null}
      </p>

      <Button
        className={cn(
          "mt-6 h-11 w-full text-base",
          sparkPendingClassName(busy)
        )}
        disabled={!ready}
        onClick={generate}
        size="lg"
        type="button"
        variant="spark"
      >
        <SparkPending pending={busy} pendingLabel={dictionary.submitting}>
          <MessagesSquareIcon />
          {dictionary.submit}
        </SparkPending>
      </Button>

      <p className="mt-4 text-xs text-muted-foreground">
        {dictionary.privacyNote}
      </p>
    </div>
  )
}
