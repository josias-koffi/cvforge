/**
 * The interviewer's reply is spoken while it is still being generated, so the
 * incoming text is drained sentence by sentence: waiting for the full answer
 * would add its whole generation time to the perceived latency.
 */

/** A terminator followed by whitespace — not "M. Dupont" or "3.5". */
const SENTENCE_END = /[.!?…](\s|$)/u

export type DrainedSentences = {
  sentences: string[]
  /** What is left over, to prepend to the next chunk. */
  rest: string
}

export function drainSentences(buffer: string): DrainedSentences {
  const sentences: string[] = []
  let rest = buffer

  for (;;) {
    const match = SENTENCE_END.exec(rest)
    if (!match) break

    const end = match.index + 1
    const sentence = rest.slice(0, end).trim()
    rest = rest.slice(end).trimStart()

    if (sentence.length > 0) sentences.push(sentence)
  }

  return { sentences, rest }
}

/** Whatever is left when the stream ends, spoken as one last utterance. */
export function flushSentences(buffer: string): string[] {
  const trimmed = buffer.trim()

  return trimmed.length > 0 ? [trimmed] : []
}
