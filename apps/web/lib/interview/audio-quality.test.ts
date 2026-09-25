import { describe, expect, it } from "vitest"

import { readAudioQuality } from "@/lib/interview/audio-quality"

describe("readAudioQuality", () => {
  it("reads loss, jitter and invented audio off the incoming voice", () => {
    expect(
      readAudioQuality([
        { kind: "audio", type: "outbound-rtp", packetsLost: 99 },
        {
          concealedSamples: 4_800,
          jitter: 0.034,
          kind: "audio",
          packetsLost: 20,
          packetsReceived: 980,
          totalSamplesReceived: 96_000,
          type: "inbound-rtp",
        },
      ])
    ).toEqual({
      concealedPct: 5,
      jitterMs: 34,
      lossPct: 2,
      packetsLost: 20,
      packetsReceived: 980,
    })
  })

  it("is null before any voice has arrived", () => {
    expect(readAudioQuality([{ type: "candidate-pair" }])).toBeNull()
  })

  it("never divides by zero", () => {
    expect(
      readAudioQuality([{ kind: "audio", type: "inbound-rtp" }])
    ).toMatchObject({ concealedPct: 0, lossPct: 0 })
  })
})
