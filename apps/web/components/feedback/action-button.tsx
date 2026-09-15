"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import type { ActionResult } from "@/lib/api"

type ActionButtonProps = Omit<React.ComponentProps<typeof Button>, "onClick"> & {
  action: () => Promise<ActionResult | void>
  pendingLabel?: string
}

/** Button that runs a server action, shows its result as a toast and refreshes data. */
export function ActionButton({
  action,
  children,
  pendingLabel,
  ...props
}: ActionButtonProps) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  return (
    <Button
      {...props}
      disabled={pending || props.disabled}
      onClick={() =>
        startTransition(async () => {
          const result = await action()

          if (!result) return
          if (result.ok) {
            if (result.message) toast.success(result.message)
            router.refresh()
          } else {
            toast.error(result.message)
          }
        })
      }
    >
      {pending ? <Spinner /> : null}
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  )
}
