"use client"

import { useId } from "react"

import { format } from "@/lib/i18n"
import { cn } from "@/lib/utils"

/** Same floor as the API: a job title alone gives a tool nothing to work from. */
export const MIN_OFFER_CHARS = 200
/** Same cap as the API, which cuts anything longer. */
export const MAX_OFFER_CHARS = 8000

export interface OfferTextFieldLabels {
  label: string
  hint: string
  placeholder: string
  /** "{count} / {min} caractères minimum" until the floor is reached. */
  counter: string
  /** Once the floor is reached: "{count} caractères". */
  counterReady: string
}

/** Whether a pasted offer is long enough to be sent. */
export function offerTextReady(offerText: string) {
  return offerText.trim().length >= MIN_OFFER_CHARS
}

/**
 * The pasted job offer every offer-based free tool asks for (US-136,
 * US-141): a labelled textarea, its hint, and a counter to the floor, both
 * tied to it for screen readers.
 */
export function OfferTextField({
  labels,
  value,
  onChange,
  disabled,
}: {
  labels: OfferTextFieldLabels
  value: string
  onChange: (value: string) => void
  disabled: boolean
}) {
  const offerId = useId()
  const hintId = useId()
  const counterId = useId()
  const length = value.trim().length
  const ready = offerTextReady(value)

  return (
    <>
      <label className="block font-medium" htmlFor={offerId}>
        {labels.label}
      </label>
      <p className="mt-1 text-sm text-muted-foreground" id={hintId}>
        {labels.hint}
      </p>
      <textarea
        aria-describedby={`${hintId} ${counterId}`}
        className="mt-2 w-full rounded-lg border bg-background p-3 text-sm transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        disabled={disabled}
        id={offerId}
        maxLength={MAX_OFFER_CHARS}
        onChange={(event) => onChange(event.target.value)}
        placeholder={labels.placeholder}
        rows={8}
        value={value}
      />
      <p
        className={cn(
          "mt-1 text-right text-xs",
          ready ? "text-muted-foreground" : "text-foreground"
        )}
        id={counterId}
      >
        {ready
          ? format(labels.counterReady, { count: length })
          : format(labels.counter, { count: length, min: MIN_OFFER_CHARS })}
      </p>
    </>
  )
}
