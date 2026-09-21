"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import type { StudioMessage } from "@/lib/interview/studio-machine"

function Bubble({
  role,
  children,
  pending,
}: {
  role: StudioMessage["role"]
  children: React.ReactNode
  pending?: boolean
}) {
  const isCandidate = role === "user"

  return (
    <div className={cn("flex", isCandidate ? "justify-end" : "justify-start")}>
      <p
        className={cn(
          "max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
          isCandidate
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground",
          pending && "opacity-70"
        )}
      >
        {children}
      </p>
    </div>
  )
}

/**
 * The conversation so far, plus the reply currently arriving.
 *
 * `aria-live="polite"` rather than assertive: the recruiter's question should
 * be announced once it settles, not interrupt itself on every token.
 */
export function TranscriptPanel({
  messages,
  streamingReply,
}: {
  messages: StudioMessage[]
  streamingReply: string
}) {
  const endRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" })
  }, [messages.length, streamingReply])

  return (
    <div
      aria-label="Transcription de l'entretien"
      aria-live="polite"
      className="flex h-full flex-col gap-3 overflow-y-auto rounded-lg border bg-background p-4"
      role="log"
    >
      {messages.length === 0 && streamingReply.length === 0 ? (
        <p className="m-auto max-w-sm text-center text-sm text-muted-foreground">
          Le recruteur vous écoute. Parlez normalement : l&apos;enregistrement
          démarre dès que vous prenez la parole et s&apos;arrête quand vous
          faites une pause.
        </p>
      ) : null}

      {messages.map((message) => (
        <Bubble key={`${message.timestamp}-${message.role}`} role={message.role}>
          {message.content}
        </Bubble>
      ))}

      {streamingReply.length > 0 ? (
        <Bubble pending role="assistant">
          {streamingReply}
        </Bubble>
      ) : null}

      <div ref={endRef} />
    </div>
  )
}
