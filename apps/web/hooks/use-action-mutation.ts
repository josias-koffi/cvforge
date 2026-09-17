"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import type { ActionResult } from "@/lib/api"

/** Runs a server action, toasts its result and refreshes the page on success. */
export function useActionMutation(onDone: () => void) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const run = (task: () => Promise<ActionResult>) =>
    startTransition(async () => {
      const result = await task()
      if (result.ok) {
        toast.success(result.message)
        onDone()
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })

  return { pending, run }
}
