import type { InterviewMessage } from "@cvforge/types"

import { formatTime } from "@/lib/format"
import { cn } from "@/lib/utils"

/**
 * One turn of the conversation.
 *
 * The speaker is named in text above the bubble rather than implied by which
 * side it sits on: alignment and colour are not available to a screen reader,
 * and "Vous" vs "Recruteur" costs one line.
 */
export function Bubble({
  role,
  timestamp,
  children,
  pending,
}: {
  role: InterviewMessage["role"]
  timestamp?: string
  children: React.ReactNode
  pending?: boolean
}) {
  const isCandidate = role === "user"

  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        isCandidate ? "items-end" : "items-start"
      )}
    >
      <p className="flex items-baseline gap-2 px-1 text-xs text-muted-foreground">
        <span className="font-medium">
          {isCandidate ? "Vous" : "Recruteur"}
        </span>
        {timestamp ? (
          <time className="tabular-nums" dateTime={timestamp}>
            {formatTime(timestamp)}
          </time>
        ) : null}
      </p>
      <p
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap",
          isCandidate
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm bg-muted text-foreground",
          pending && "opacity-70"
        )}
      >
        {children}
      </p>
    </div>
  )
}

/**
 * The conversation, oldest first — the same thread whether it is still being
 * spoken in the studio or read back later from the session's details.
 */
export function TranscriptThread({
  messages,
  showTimestamps,
}: {
  messages: InterviewMessage[]
  showTimestamps?: boolean
}) {
  return (
    <>
      {messages.map((message, index) => (
        // The index is part of the key on purpose: two turns can share a
        // millisecond, and React then reuses the wrong bubble.
        <Bubble
          key={`${message.timestamp}-${message.role}-${index}`}
          role={message.role}
          timestamp={showTimestamps ? message.timestamp : undefined}
        >
          {message.content}
        </Bubble>
      ))}
    </>
  )
}
