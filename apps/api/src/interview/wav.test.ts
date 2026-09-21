import { describe, expect, it } from "vitest";
import { ANSWER_SAMPLE_RATE, wrapPcm16InWav } from "./wav";

const HEADER_BYTES = 44;

/** Little-endian 16-bit samples, the way the studio sends them. */
function pcm(...samples: number[]) {
  const bytes = Buffer.alloc(samples.length * 2);
  samples.forEach((sample, index) => bytes.writeInt16LE(sample, index * 2));

  return bytes;
}

describe("wrapPcm16InWav", () => {
  it("writes a canonical 16-bit mono header", () => {
    const file = wrapPcm16InWav(pcm(0, 1000, -1000));

    expect(file.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(file.subarray(8, 12).toString("ascii")).toBe("WAVE");
    expect(file.subarray(12, 16).toString("ascii")).toBe("fmt ");
    expect(file.readUInt16LE(20)).toBe(1); // PCM
    expect(file.readUInt16LE(22)).toBe(1); // mono
    expect(file.readUInt32LE(24)).toBe(ANSWER_SAMPLE_RATE);
    expect(file.readUInt32LE(28)).toBe(ANSWER_SAMPLE_RATE * 2); // byte rate
    expect(file.readUInt16LE(32)).toBe(2); // block align
    expect(file.readUInt16LE(34)).toBe(16);
    expect(file.subarray(36, 40).toString("ascii")).toBe("data");
  });

  it("declares the sizes the samples actually add up to", () => {
    const file = wrapPcm16InWav(pcm(0, 1, 2, 3));

    expect(file.readUInt32LE(40)).toBe(8);
    expect(file.readUInt32LE(4)).toBe(36 + 8);
    expect(file).toHaveLength(HEADER_BYTES + 8);
  });

  it("leaves the samples untouched after the header", () => {
    const samples = pcm(0, 16384, -16384);

    expect(wrapPcm16InWav(samples).subarray(HEADER_BYTES)).toEqual(samples);
  });

  it("drops a byte that is half a sample rather than mis-declaring the size", () => {
    // A stream cut anywhere can end mid-sample; a header counting it would be
    // out of step with its own data.
    const file = wrapPcm16InWav(Buffer.concat([pcm(1000), Buffer.from([0x42])]));

    expect(file.readUInt32LE(40)).toBe(2);
    expect(file).toHaveLength(HEADER_BYTES + 2);
  });

  it("writes a valid empty file rather than throwing", () => {
    const file = wrapPcm16InWav(Buffer.alloc(0));

    expect(file).toHaveLength(HEADER_BYTES);
    expect(file.readUInt32LE(40)).toBe(0);
  });

  it("honours a rate other than the default", () => {
    expect(wrapPcm16InWav(pcm(1), 8000).readUInt32LE(24)).toBe(8000);
  });
});
