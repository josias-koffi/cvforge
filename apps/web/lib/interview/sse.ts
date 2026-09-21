import type { InterviewAIResponseEvent } from "@cvforge/types"

/**
 * Incremental parser for the reply stream.
 *
 * A network read does not respect line boundaries, so an event can arrive
 * split across two chunks — the tail is held until the newline that completes
 * it shows up. Getting this wrong drops tokens at random, which reads as the
 * interviewer swallowing words.
 */
export function createSseParser() {
  const decoder = new TextDecoder()
  let buffer = ""

  return {
    /** Every complete event contained in this chunk. */
    push(chunk: Uint8Array): InterviewAIResponseEvent[] {
      buffer += decoder.decode(chunk, { stream: true })

      const lines = buffer.split("\n")
      // The last piece is whatever came before the next newline: keep it.
      buffer = lines.pop() ?? ""

      const events: InterviewAIResponseEvent[] = []

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith("data:")) continue

        const payload = trimmed.slice(5).trim()
        if (payload.length === 0 || payload === "[DONE]") continue

        try {
          events.push(JSON.parse(payload) as InterviewAIResponseEvent)
        } catch {
          // A malformed frame is skipped rather than ending the turn.
        }
      }

      return events
    },
  }
}
