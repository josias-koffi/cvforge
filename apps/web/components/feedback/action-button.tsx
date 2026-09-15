"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { cn } from "cn"

import { PendingContent, sparkClassName } from "@/components/feedback/pending-content"
import { Button } from "@/components/ui/button"
import type { ActionResult } from "@/lib/api"

type ActionButtonProps = Omit<React.ComponentProps<typeof Button>, "onClick"> & {
  action: () => Promise<ActionResult | void>
  pendingLabel?: string
  /** Marks an AI generation: amber button, shimmer and pulsing spark while pending. */
  spark?: boolean
}

/** Button that runs a server action, shows its result as a toast and refreshes data. */
export function ActionButton({
  action,
  children,
  className,
  pendingLabel,
  spark,
  variant,
  ...props
}: ActionButtonProps) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  return (
    <Button
      {...props}
      variant={variant ?? (spark ? "spark" : undefined)}
      className={cn(spark && sparkClassName(pending), className)}
      disabled={pending || props.disabled}
      onClick={() =>
        startTransition(async () => {
          const result = await action()

          if (!result) return
          if (result.ok) {
            if (result.message) toast.success(result.message, spark ? { className: "spark" } : undefined)
            router.refresh()
          } else {
            toast.error(result.message)
          }
        })
      }
    >
      <PendingContent pending={pending} pendingLabel={pendingLabel} spark={spark}>
        {children}
      </PendingContent>
    </Button>
  )
}
