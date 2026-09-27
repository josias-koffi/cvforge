import type { InterviewQuestionKind } from "@cvforge/types"

import type { ToolLeadCtaDictionary } from "@/components/tools/tool-lead-cta"
import type { OfferTextFieldLabels } from "@/components/tools/offer-text-field"

/**
 * The free "likely interview questions" tool (US-141). Kept apart from
 * `types.ts`, like its wording from `fr.ts` and `en.ts`. Its refusals are
 * worded in `ats.errors`, with every other tool's.
 */
export interface InterviewQuestionsDictionary extends ToolLeadCtaDictionary {
  metaTitle: string
  metaDescription: string
  eyebrow: string
  title: string
  subtitle: string
  offer: OfferTextFieldLabels
  submit: string
  submitting: string
  privacyNote: string
  result: {
    title: string
    /** Says the questions are generated, likely rather than certain. */
    intro: string
    kinds: Record<InterviewQuestionKind, string>
    /** Before the recruiter's intent: "Ce que le recruteur cherche :" */
    intentLabel: string
    again: string
  }
}
