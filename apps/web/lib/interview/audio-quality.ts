/**
 * How the recruiter's voice actually arrived, from the peer connection's own
 * statistics.
 *
 * A voice that crackles "like a rusty floppy disk" is the browser filling in
 * audio that never came (`concealedSamples`): packets lost, or late past the
 * jitter buffer. These figures say which, so a complaint can be told apart
 * between the candidate's network and the call itself.
 */
export type AudioQuality = {
  packetsReceived: number
  packetsLost: number
  /** Share of packets that never arrived, in percent. */
  lossPct: number
  /** Network jitter, in milliseconds. */
  jitterMs: number
  /** Share of the voice the browser had to invent, in percent. */
  concealedPct: number
}

type InboundAudio = {
  type?: string
  kind?: string
  mediaType?: string
  packetsReceived?: number
  packetsLost?: number
  jitter?: number
  concealedSamples?: number
  totalSamplesReceived?: number
}

const percent = (part: number, whole: number) =>
  whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0

/** The incoming audio stream's figures, or null before any arrived. */
export function readAudioQuality(
  reports: Iterable<InboundAudio>
): AudioQuality | null {
  for (const report of reports) {
    if (report.type !== "inbound-rtp") continue
    if ((report.kind ?? report.mediaType) !== "audio") continue

    const received = report.packetsReceived ?? 0
    const lost = Math.max(0, report.packetsLost ?? 0)

    return {
      concealedPct: percent(
        report.concealedSamples ?? 0,
        report.totalSamplesReceived ?? 0
      ),
      jitterMs: Math.round((report.jitter ?? 0) * 1000),
      lossPct: percent(lost, received + lost),
      packetsLost: lost,
      packetsReceived: received,
    }
  }

  return null
}
