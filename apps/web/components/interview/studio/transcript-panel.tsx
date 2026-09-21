"use client"

import * as React from "react"

import { Bubble, TranscriptThread } from "@/components/interview/transcript-thread"
import { cn } from "@/lib/utils"
import type { StudioMessage } from "@/lib/interview/studio-machine"

/**
 * How far from the bottom still counts as "following the conversation".
 * Beyond it the candidate has scrolled back to reread something, and yanking
 * them down on the next token would be rude.
 */
const FOLLOW_THRESHOLD_PX = 80

/**
 * The conversation so far, plus the reply currently arriving.
 *
 * Fixed height and its own scrollbar: the thread behaves like any chat, and
 * the page around it stays where the candidate left it.
 *
 * `aria-live="polite"` rather than assertive: the recruiter's question should
 * be announced once it settles, not interrupt itself on every token.
 */
export function TranscriptPanel({
  messages,
  streamingReply,
  className,
}: {
  messages: StudioMessage[]
  streamingReply: string
  className?: string
}) {
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    // `scrollIntoView` moved the whole page as well as the thread, which is
    // exactly what a fixed-height panel is meant to avoid.
    const distance =
      container.scrollHeight - container.scrollTop - container.clientHeight
    if (distance > FOLLOW_THRESHOLD_PX) return

    container.scrollTop = container.scrollHeight
  }, [messages.length, streamingReply])

  return (
    <div
      aria-label="Transcription de l'entretien"
      aria-live="polite"
      className={cn(
        "flex flex-col gap-4 overflow-y-auto rounded-xl border bg-card p-4",
        className
      )}
      ref={scrollRef}
      role="log"
    >
      {messages.length === 0 && streamingReply.length === 0 ? (
        <p className="m-auto max-w-sm text-center text-sm text-muted-foreground">
          Le recruteur vous écoute. Parlez normalement : l&apos;enregistrement
          démarre dès que vous prenez la parole et s&apos;arrête quand vous
          faites une pause.
        </p>
      ) : null}

      <TranscriptThread messages={messages} />

      {streamingReply.length > 0 ? (
        <Bubble pending role="assistant">
          {streamingReply}
        </Bubble>
      ) : null}
    </div>
  )
}
