"use client"

import { useFormStatus } from "react-dom"
import { cn } from "cn"

import { PendingContent, sparkClassName } from "@/components/feedback/pending-content"
import { CreditPill } from "@/components/credits/credit-pill"
import { Button } from "@/components/ui/button"

type SubmitButtonProps = React.ComponentProps<typeof Button> & {
  pendingLabel?: string
  /** Marks an AI generation: amber button, shimmer and pulsing spark while pending. */
  spark?: boolean
  /** Credits the action spends: shown on the button, which then turns amber. */
  credits?: number
}

export function SubmitButton({
  children,
  className,
  credits,
  pendingLabel,
  spark: sparkProp,
  variant,
  ...props
}: SubmitButtonProps) {
  const spark = sparkProp ?? Boolean(credits)
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      variant={variant ?? (spark ? "spark" : undefined)}
      className={cn(spark && sparkClassName(pending), className)}
      disabled={pending || props.disabled}
      {...props}
    >
      <PendingContent pending={pending} pendingLabel={pendingLabel} spark={spark}>
        {children}
        <CreditPill amount={credits} />
      </PendingContent>
    </Button>
  )
}
