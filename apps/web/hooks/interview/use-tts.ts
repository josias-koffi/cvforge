"use client"

import type { Locale } from "@cvforge/types"
import * as React from "react"

import { drainSentences, flushSentences } from "@/lib/interview/sentences"

type Queue = {
  pending: string[]
  speaking: boolean
}

function pickVoice(synthesis: SpeechSynthesis, lang: string) {
  return synthesis
    .getVoices()
    .find((voice) => voice.lang.startsWith(lang.slice(0, 2)))
}

/**
 * Speaks the queue, one utterance at a time.
 *
 * A plain function rather than a `useCallback`: it has to call itself when an
 * utterance ends, and a hook cannot reference itself before it is declared.
 */
function speakQueue(synthesis: SpeechSynthesis, queue: Queue, lang: string) {
  if (queue.speaking) return

  const text = queue.pending.shift()
  if (!text) return

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang

  const voice = pickVoice(synthesis, lang)
  if (voice) utterance.voice = voice

  const next = () => {
    queue.speaking = false
    speakQueue(synthesis, queue, lang)
  }
  utterance.onend = next
  // An error must not strand the queue: move on to the next sentence.
  utterance.onerror = next

  queue.speaking = true
  synthesis.speak(utterance)
}

/**
 * Speaks the interviewer's reply with the browser's own voice, sentence by
 * sentence as it streams in — waiting for the whole answer would add its
 * generation time to the silence the candidate hears.
 *
 * Deliberately not made resilient. `speechSynthesis` is uneven (Chrome cuts
 * off after about fifteen seconds, Safari wants a user gesture first), so the
 * turn never depends on it: if it is missing or fails, the reply is still
 * there to read in the transcript.
 */
export function useTts(language: Locale) {
  const bufferRef = React.useRef("")
  const queueRef = React.useRef<Queue>({ pending: [], speaking: false })

  const synthesis =
    typeof window !== "undefined" && "speechSynthesis" in window
      ? window.speechSynthesis
      : null
  const lang = language === "en" ? "en-US" : "fr-FR"

  /** Feeds streamed text in; complete sentences are spoken as they appear. */
  const push = React.useCallback(
    (text: string) => {
      bufferRef.current += text

      const { sentences, rest } = drainSentences(bufferRef.current)
      bufferRef.current = rest

      if (sentences.length === 0 || !synthesis) return

      queueRef.current.pending.push(...sentences)
      speakQueue(synthesis, queueRef.current, lang)
    },
    [lang, synthesis]
  )

  /** Speaks whatever is left once the stream ends. */
  const flush = React.useCallback(() => {
    const remaining = flushSentences(bufferRef.current)
    bufferRef.current = ""

    if (remaining.length === 0 || !synthesis) return

    queueRef.current.pending.push(...remaining)
    speakQueue(synthesis, queueRef.current, lang)
  }, [lang, synthesis])

  const cancel = React.useCallback(() => {
    bufferRef.current = ""
    queueRef.current = { pending: [], speaking: false }
    synthesis?.cancel()
  }, [synthesis])

  // Leaving the page mid-sentence must not leave a voice talking.
  React.useEffect(() => () => synthesis?.cancel(), [synthesis])

  return { cancel, flush, push, supported: synthesis !== null }
}
