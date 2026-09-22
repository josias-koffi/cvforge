/**
 * Reading an `AnalyserNode`, as arithmetic.
 *
 * Three places need it and none of them is about deciding whether someone is
 * talking: the microphone loop, the meter the orb breathes with, and the
 * player measuring what the speakers are putting out. The frames are
 * *time-domain* samples (`getByteTimeDomainData`), bytes centred on 128.
 *
 * An earlier version read `getByteFrequencyData`, whose bytes are decibels
 * mapped through the analyser's `minDecibels`/`maxDecibels` — left at -100 and
 * -30. A 0.05 threshold there meant roughly -96 dB, which is digital silence:
 * no real room ever goes that quiet, so a turn never ended by itself.
 * Amplitude is what these thresholds always meant.
 */

/**
 * Analyser window. 2048 samples is ~43 ms at 48 kHz.
 *
 * `getByteTimeDomainData` returns only the most recent `fftSize` samples, so
 * the window has to be at least as long as the gap between two reads, or the
 * caller is sampling a fraction of what was said. At 256 samples — 5.3 ms —
 * the detector listened to a third of a 60 fps frame, and to 3% of a frame
 * once a WebGL canvas pulled the page down to 5 fps: speech fell between the
 * samples and the microphone appeared deaf.
 */
export const ANALYSER_FFT_SIZE = 2048

/**
 * Loudness of one frame as amplitude, 0-1.
 *
 * The scale every threshold in the detector is expressed against, and the one
 * the player reports its own output on, so the two can be compared.
 */
export function computeAmplitudeRms(frame: Uint8Array): number {
  if (frame.length === 0) return 0

  let sumOfSquares = 0
  for (let index = 0; index < frame.length; index += 1) {
    const centered = ((frame[index] ?? 128) - 128) / 128
    sumOfSquares += centered * centered
  }

  return Math.sqrt(sumOfSquares / frame.length)
}

/**
 * Peak deviation from the centre line, 0-1: it tracks a voice legibly on a
 * meter where an RMS would barely move.
 *
 * Shared by the microphone loop and the interviewer's voice, so the orb
 * breathes at the same scale whoever is talking.
 */
export function computeLevel(frame: Uint8Array) {
  let peak = 0
  for (let index = 0; index < frame.length; index += 1) {
    peak = Math.max(peak, Math.abs((frame[index] ?? 128) - 128))
  }

  return Math.round((peak / 128) * 100) / 100
}
