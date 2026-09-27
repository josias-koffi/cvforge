/**
 * Reading an `AnalyserNode`, as arithmetic.
 *
 * Only the orb needs it: deciding who is talking is the call's own job
 * (ADR-026). The frames are *time-domain* samples (`getByteTimeDomainData`),
 * bytes centred on 128 — amplitude, not the decibels of
 * `getByteFrequencyData`.
 */

/**
 * Analyser window. 2048 samples is ~43 ms at 48 kHz.
 *
 * `getByteTimeDomainData` returns only the most recent `fftSize` samples, so
 * the window has to be at least as long as the gap between two reads, or the
 * meter shows a fraction of what was said.
 */
export const ANALYSER_FFT_SIZE = 2048

/**
 * Peak deviation from the centre line, 0-1: it tracks a voice legibly on a
 * meter where an RMS would barely move.
 *
 * Shared by the microphone and the interviewer's voice, so the orb breathes
 * at the same scale whoever is talking.
 */
export function computeLevel(frame: Uint8Array) {
  let peak = 0
  for (let index = 0; index < frame.length; index += 1) {
    peak = Math.max(peak, Math.abs((frame[index] ?? 128) - 128))
  }

  return Math.round((peak / 128) * 100) / 100
}
