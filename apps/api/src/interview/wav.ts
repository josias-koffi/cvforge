/**
 * Puts a WAV container around samples that arrived without one.
 *
 * The studio sends the candidate's voice as raw 16 kHz mono PCM16 while they
 * are speaking, because raw samples are the only thing that can be cut
 * anywhere and still be readable. The speech models want a file, so the header
 * is written once here, over the assembled answer.
 *
 * Ported from `apps/web/lib/interview/wav.ts`, which writes the same 44 bytes
 * in the browser. Two copies rather than a shared package: this is a fixed
 * format from 1991, not a decision either side gets to change.
 */

/** What the studio records at, and what the speech models expect. */
export const ANSWER_SAMPLE_RATE = 16000;

const HEADER_BYTES = 44;
const BITS_PER_SAMPLE = 16;
const BYTES_PER_SAMPLE = BITS_PER_SAMPLE / 8;

/** A canonical 44-byte PCM header for mono 16-bit audio. */
export function writeWavHeader(
  header: Buffer,
  sampleCount: number,
  sampleRate: number,
): void {
  const dataSize = sampleCount * BYTES_PER_SAMPLE;

  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16); // chunk size
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * BYTES_PER_SAMPLE, 28); // byte rate
  header.writeUInt16LE(BYTES_PER_SAMPLE, 32); // block align
  header.writeUInt16LE(BITS_PER_SAMPLE, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(dataSize, 40);
}

/**
 * Assembled samples to a complete WAV file.
 *
 * An odd byte means the last sample was cut in half somewhere; it is dropped
 * rather than left to shift the header's count out of step with the data.
 */
export function wrapPcm16InWav(
  samples: Buffer,
  sampleRate: number = ANSWER_SAMPLE_RATE,
): Buffer {
  const usable = samples.subarray(0, samples.length - (samples.length % 2));
  const header = Buffer.alloc(HEADER_BYTES);

  writeWavHeader(header, usable.length / BYTES_PER_SAMPLE, sampleRate);

  return Buffer.concat([header, usable], HEADER_BYTES + usable.length);
}
