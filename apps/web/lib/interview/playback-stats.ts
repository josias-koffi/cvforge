/**
 * What the candidate actually heard, counted frame by frame.
 *
 * The server already logs one line per turn, but its clock starts when the
 * request reaches Nest: encoding the answer, uploading a megabyte of base64 and
 * every gap in the playback fall outside it. Those are precisely the parts the
 * candidate sits through, so they are measured here instead.
 *
 * Arithmetic only, like `vad` and `jitter` beside it: the hooks feed it samples
 * and the studio renders the snapshot.
 */

/** One scheduled frame of the interviewer's voice. */
export type PlaybackSample = {
  /** How far ahead of the speakers the frame was scheduled, in milliseconds. */
  leadMs: number
  /** The frame arrived after the playhead had passed: a gap was heard. */
  underrun: boolean
  /** Its base64 did not end on a 4-character boundary. */
  misaligned: boolean
}

export type PlaybackStats = {
  frames: number
  underruns: number
  misalignedFrames: number
  /** Median lead. Null until a frame has played. */
  leadP50Ms: number | null
  /** The worst margin of the turn — the one that decides if a gap is heard. */
  leadMinMs: number | null
  /** Turning the recording into the WAV the API expects. */
  encodeMs: number | null
  /** From the request leaving to the first byte of the reply coming back. */
  uploadMs: number | null
}

export const emptyPlaybackStats: PlaybackStats = {
  frames: 0,
  underruns: 0,
  misalignedFrames: 0,
  leadP50Ms: null,
  leadMinMs: null,
  encodeMs: null,
  uploadMs: null,
}

/**
 * The lower median: with an even number of frames it returns the lower of the
 * two middle values rather than their mean. Averaging would invent a lead that
 * no frame ever had, and the point here is to report what happened.
 */
function median(values: number[]): number | null {
  if (values.length === 0) return null

  const sorted = [...values].sort((left, right) => left - right)

  return sorted[Math.floor((sorted.length - 1) / 2)] ?? null
}

export type PlaybackStatsRecorder = {
  record(sample: PlaybackSample): void
  markEncode(durationMs: number): void
  markUpload(durationMs: number): void
  snapshot(): PlaybackStats
  reset(): void
}

/** One recorder per turn; `reset` between them so a turn is read on its own. */
export function createPlaybackStats(): PlaybackStatsRecorder {
  let leads: number[] = []
  // Tracked as it goes rather than with `Math.min(...leads)`: a long answer
  // runs to thousands of frames, which is where spreading an array starts
  // throwing.
  let leadMinMs: number | null = null
  let underruns = 0
  let misalignedFrames = 0
  let encodeMs: number | null = null
  let uploadMs: number | null = null

  return {
    record(sample) {
      leads.push(sample.leadMs)
      leadMinMs =
        leadMinMs === null ? sample.leadMs : Math.min(leadMinMs, sample.leadMs)
      if (sample.underrun) underruns += 1
      if (sample.misaligned) misalignedFrames += 1
    },

    markEncode(durationMs) {
      encodeMs = durationMs
    },

    markUpload(durationMs) {
      uploadMs = durationMs
    },

    snapshot() {
      return {
        frames: leads.length,
        underruns,
        misalignedFrames,
        leadP50Ms: median(leads),
        leadMinMs,
        encodeMs,
        uploadMs,
      }
    },

    reset() {
      leads = []
      leadMinMs = null
      underruns = 0
      misalignedFrames = 0
      encodeMs = null
      uploadMs = null
    },
  }
}
