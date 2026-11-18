"use client"

import { useState, useSyncExternalStore } from "react"
import { BellRingIcon, XIcon } from "lucide-react"

import { usePush } from "@/components/notifications/use-push"
import { Button } from "@/components/ui/button"

const DISMISSED_KEY = "jobspark:push-prompt-dismissed"

function readDismissed() {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === "1"
  } catch {
    return false
  }
}

function writeDismissed() {
  try {
    window.localStorage.setItem(DISMISSED_KEY, "1")
  } catch {
    // Private mode: the banner comes back next visit, nothing breaks.
  }
}

/**
 * Asks once to turn notifications on, since the job alerts no longer come by
 * e-mail. Only while the browser has not been asked yet, and never again
 * once the candidate closed it.
 */
export function PushPromptBanner({ publicKey }: { publicKey: string | null }) {
  const push = usePush(publicKey)
  const [closed, setClosed] = useState(false)
  const dismissedBefore = useSyncExternalStore(
    () => () => {},
    readDismissed,
    () => true
  )

  if (!publicKey || closed || dismissedBefore || push.permission !== "default")
    return null

  function close() {
    writeDismissed()
    setClosed(true)
  }

  return (
    <div className="mx-4 flex flex-col gap-3 rounded-xl border bg-primary/5 p-4 motion-safe:animate-in motion-safe:fade-in sm:flex-row sm:items-center lg:mx-6">
      <div className="flex flex-1 items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <BellRingIcon className="size-4" />
        </span>
        <div className="space-y-0.5">
          <p className="text-sm font-medium">
            Soyez prévenu des nouvelles offres
          </p>
          <p className="text-sm text-muted-foreground">
            Les alertes arrivent désormais en notification, plus par e-mail :
            2 par jour au plus, rien la nuit.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 self-end sm:self-auto">
        <Button
          size="sm"
          disabled={push.busy}
          onClick={async () => {
            if (await push.enable()) close()
          }}
        >
          Activer
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Plus tard"
          onClick={close}
        >
          <XIcon />
        </Button>
      </div>
    </div>
  )
}
