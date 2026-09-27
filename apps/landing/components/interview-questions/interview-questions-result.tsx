import { forwardRef } from "react"
import { MicIcon, RotateCcwIcon } from "lucide-react"
import type { InterviewQuestion } from "@cvforge/types"

import { ToolLeadCta } from "@/components/tools/tool-lead-cta"
import { Button } from "@/components/ui/button"
import type { InterviewQuestionsDictionary } from "@/content/interview-questions/types"
import type { LandingDictionary } from "@/content/types"
import { postInterviewQuestionsLead } from "@/lib/interview-questions-client"

/**
 * The five likely questions, each with what the recruiter is after, then the
 * way on: the same offer as a voice interview, which takes an account (US-141).
 */
export const InterviewQuestionsResult = forwardRef<
  HTMLDivElement,
  {
    dictionary: InterviewQuestionsDictionary
    errors: LandingDictionary["ats"]
    questions: InterviewQuestion[]
    offerText: string
    onCtaClick: () => void
    onLeadSent: () => void
    onRestart: () => void
  }
>(function InterviewQuestionsResult(
  {
    dictionary,
    errors,
    questions,
    offerText,
    onCtaClick,
    onLeadSent,
    onRestart,
  },
  ref
) {
  const { result } = dictionary

  return (
    <div className="flex flex-col gap-6">
      <div
        aria-live="polite"
        className="rounded-2xl border bg-card p-6 shadow-raised focus-visible:outline-none md:p-8"
        ref={ref}
        tabIndex={-1}
      >
        <h2 className="text-xl font-medium">{result.title}</h2>
        <p className="mt-2 text-sm text-pretty text-muted-foreground">
          {result.intro}
        </p>
        <ol className="mt-6 flex flex-col gap-4">
          {questions.map((question, index) => (
            <li
              className="animate-rise-in rounded-xl border bg-background p-4"
              key={`${index}-${question.question}`}
            >
              <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span aria-hidden="true">{index + 1}.</span>
                <span className="rounded-full border px-2 py-0.5">
                  {result.kinds[question.kind]}
                </span>
              </p>
              <p className="mt-2 font-medium text-pretty">
                {question.question}
              </p>
              <p className="mt-2 text-sm text-pretty text-muted-foreground">
                <span className="font-medium text-foreground">
                  {result.intentLabel}
                </span>{" "}
                {question.intent}
              </p>
            </li>
          ))}
        </ol>
        <Button
          className="mt-6"
          onClick={onRestart}
          type="button"
          variant="outline"
        >
          <RotateCcwIcon />
          {result.again}
        </Button>
      </div>

      <ToolLeadCta
        dictionary={dictionary}
        errors={errors}
        icon={<MicIcon />}
        onCtaClick={onCtaClick}
        onLeadSent={onLeadSent}
        submit={(email, consent) =>
          postInterviewQuestionsLead(email, consent, offerText)
        }
      />
    </div>
  )
})
