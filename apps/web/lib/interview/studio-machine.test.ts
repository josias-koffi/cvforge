import { describe, expect, it } from "vitest"

import {
  initialStudioState,
  studioReducer,
  type StudioEvent,
  type StudioState,
} from "@/lib/interview/studio-machine"

function run(events: StudioEvent[], from: StudioState = initialStudioState) {
  return events.reduce(studioReducer, from)
}

const LIVE = run([
  { type: "CONNECTING" },
  { startedAt: "2026-09-25T10:00:00.000Z", type: "CONNECTED" },
])

describe("studioReducer", () => {
  it("connects, then waits for someone to speak", () => {
    expect(run([{ type: "CONNECTING" }]).phase).toBe("connecting")
    expect(LIVE).toMatchObject({
      phase: "listening",
      startedAt: "2026-09-25T10:00:00.000Z",
    })
  })

  it("takes the server's start on every connection, as a resume moves it", () => {
    const state = run(
      [{ startedAt: "2026-09-25T10:05:00.000Z", type: "CONNECTED" }],
      LIVE
    )

    expect(state.startedAt).toBe("2026-09-25T10:05:00.000Z")
  })

  it("fails loudly when the call cannot open", () => {
    expect(
      run([{ message: "Micro refusé", type: "MIC_FAILED" }])
    ).toMatchObject({ error: "Micro refusé", phase: "error" })
  })

  it("follows one full exchange and measures the wait", () => {
    const state = run(
      [
        { type: "USER_SPEECH_START" },
        { atMs: 1_000, itemId: "u1", type: "USER_SPEECH_END" },
        { text: "Très ", type: "AI_DELTA" },
        { atMs: 1_600, type: "AI_AUDIO_STARTED" },
        { text: "bien.", type: "AI_DELTA" },
        { atMs: 1_900, type: "AI_AUDIO_STARTED" },
        { type: "AI_DONE" },
      ],
      LIVE
    )

    expect(state.phase).toBe("speaking")
    expect(state.firstTokenMs).toBe(600)
    expect(state.messages.map((m) => [m.role, m.content])).toEqual([
      ["user", ""],
      ["assistant", "Très bien."],
    ])

    expect(run([{ type: "VOICE_DONE" }], state).phase).toBe("listening")
  })

  it("files a late transcript above the reply it prompted", () => {
    const state = run(
      [
        { atMs: 1_000, itemId: "u1", type: "USER_SPEECH_END" },
        { text: "Pourquoi ?", type: "AI_DELTA" },
        { type: "AI_DONE" },
        { itemId: "u1", text: " Je suis motivée. ", type: "TRANSCRIBED" },
      ],
      LIVE
    )

    expect(state.messages.map((m) => [m.role, m.content, m.pending])).toEqual([
      ["user", "Je suis motivée.", false],
      ["assistant", "Pourquoi ?", undefined],
    ])
  })

  it("drops the placeholder of an answer nothing could be heard in", () => {
    const state = run(
      [
        { atMs: 1_000, itemId: "u1", type: "USER_SPEECH_END" },
        { itemId: "u1", text: "", type: "TRANSCRIBED" },
      ],
      LIVE
    )

    expect(state.messages).toEqual([])
  })

  it("keeps what the recruiter said when the candidate cuts in", () => {
    const speaking = run(
      [
        { text: "Pouvez-vous me", type: "AI_DELTA" },
        { atMs: 0, type: "AI_AUDIO_STARTED" },
      ],
      LIVE
    )

    const state = run([{ type: "USER_SPEECH_START" }], speaking)

    expect(state.phase).toBe("recording")
    expect(state.streamingReply).toBe("")
    expect(state.messages.at(-1)).toMatchObject({
      content: "Pouvez-vous me",
      role: "assistant",
    })
  })

  it("ignores speech before the call is up", () => {
    expect(run([{ type: "USER_SPEECH_START" }]).phase).toBe("booting")
  })

  it("ends the call, remembering whether the recruiter concluded", () => {
    expect(run([{ concluded: true, type: "CALL_ENDED" }], LIVE)).toMatchObject({
      concluded: true,
      phase: "ended",
    })
    expect(run([{ concluded: false, type: "CALL_ENDED" }], LIVE).concluded).toBe(
      false
    )
  })

  it("stays finished, unless scoring fails", () => {
    const finished = run([{ type: "FINISHED" }], LIVE)

    expect(run([{ type: "USER_SPEECH_START" }], finished).phase).toBe("completed")
    expect(
      run([{ message: "Échec", type: "FINISH_FAILED" }], finished)
    ).toMatchObject({ error: "Échec", phase: "ended" })
  })

  it("mutes without dropping the call", () => {
    const muted = run([{ type: "MUTE_TOGGLED" }], LIVE)

    expect(muted).toMatchObject({ muted: true, phase: "listening", level: 0 })
    expect(run([{ type: "MUTE_TOGGLED" }], muted).muted).toBe(false)
  })

  it("hands the floor back after a reply with no voice", () => {
    // A tool call or a cancelled turn: waiting for a voice would hang the
    // studio, and with it the automatic analysis.
    const state = run(
      [
        { atMs: 1_000, itemId: "u1", type: "USER_SPEECH_END" },
        { type: "AI_DONE" },
      ],
      LIVE
    )

    expect(state.phase).toBe("listening")
  })

  it("remembers the recruiter's goodbye", () => {
    expect(run([{ type: "CONCLUDED" }], LIVE).concluded).toBe(true)
  })

  it("pauses with the clock stopped, and resumes on the next connection", () => {
    const paused = run(
      [
        { text: "Parlez-moi", type: "AI_DELTA" },
        { pausedAt: "2026-09-25T10:04:00.000Z", type: "PAUSED" },
      ],
      LIVE
    )

    expect(paused).toMatchObject({
      pausedAt: "2026-09-25T10:04:00.000Z",
      phase: "paused",
      streamingReply: "",
    })
    expect(paused.messages.at(-1)?.content).toBe("Parlez-moi")
    expect(run([{ type: "USER_SPEECH_START" }], paused).phase).toBe("paused")

    const resumed = run(
      [{ startedAt: "2026-09-25T10:02:00.000Z", type: "CONNECTED" }],
      paused
    )
    expect(resumed).toMatchObject({ pausedAt: null, phase: "listening" })
  })

  it("reports an error inside the call without ending it", () => {
    expect(
      run([{ message: "Quota", type: "CALL_ERROR" }], LIVE)
    ).toMatchObject({ error: "Quota", phase: "listening" })
  })
})
