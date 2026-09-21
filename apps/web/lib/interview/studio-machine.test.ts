import { describe, expect, it } from "vitest"

import {
  initialStudioState,
  studioReducer,
  type StudioEvent,
  type StudioState,
} from "@/lib/interview/studio-machine"

/** Applies a run of events, so a test reads as the scenario it describes. */
function run(events: StudioEvent[], from: StudioState = initialStudioState) {
  return events.reduce(studioReducer, from)
}

const ready = run([{ type: "MIC_READY" }])

describe("studioReducer", () => {
  it("waits for the microphone before anything else", () => {
    expect(initialStudioState.phase).toBe("booting")
    expect(ready.phase).toBe("listening")
    expect(ready.vadStatus).toBe("listening")
  })

  it("stops at an unusable microphone", () => {
    const state = run([{ type: "MIC_FAILED", message: "Micro refusé." }])

    expect(state.phase).toBe("error")
    expect(state.error).toBe("Micro refusé.")
  })

  it("runs a full turn: speak, transcribe, answer", () => {
    const state = run(
      [
        { type: "SPEECH_START" },
        { type: "SPEECH_END" },
        { type: "TRANSCRIBED", text: "J'ai mené la refonte." },
        { type: "AI_DELTA", text: "Très bien. ", elapsedMs: 800 },
        { type: "AI_DELTA", text: "Quel rôle ?", elapsedMs: 1200 },
        { type: "AI_DONE" },
      ],
      ready
    )

    expect(state.phase).toBe("listening")
    expect(state.streamingReply).toBe("")
    expect(state.messages.map((message) => message.content)).toEqual([
      "J'ai mené la refonte.",
      "Très bien. Quel rôle ?",
    ])
    expect(state.messages.map((message) => message.role)).toEqual([
      "user",
      "assistant",
    ])
  })

  it("times the first token, not the last", () => {
    const state = run(
      [
        { type: "TRANSCRIBED", text: "réponse" },
        { type: "AI_DELTA", text: "a", elapsedMs: 900 },
        { type: "AI_DELTA", text: "b", elapsedMs: 1500 },
      ],
      ready
    )

    expect(state.firstTokenMs).toBe(900)
  })

  it("reopens the mic on a silent segment without advancing the conversation", () => {
    const state = run(
      [
        { type: "SPEECH_START" },
        { type: "SPEECH_END" },
        { type: "TRANSCRIBED", text: "   " },
      ],
      ready
    )

    expect(state.phase).toBe("listening")
    expect(state.messages).toEqual([])
  })

  it("ignores speech while a segment is uploading or the recruiter is talking", () => {
    for (const phase of ["processing", "speaking"] as const) {
      const state = studioReducer({ ...ready, phase }, { type: "SPEECH_START" })

      expect(state.phase).toBe(phase)
    }
  })

  it("ignores an end of speech that never started", () => {
    expect(studioReducer(ready, { type: "SPEECH_END" }).phase).toBe("listening")
  })

  it("keeps the session alive when a turn fails", () => {
    const failures: StudioEvent[] = [
      { type: "TRANSCRIBE_FAILED", message: "transcription KO" },
      { type: "AI_FAILED", message: "recruteur KO" },
    ]

    for (const failure of failures) {
      const state = studioReducer({ ...ready, phase: "processing" }, failure)

      expect(state.phase).toBe("listening")
      expect(state.error).not.toBeNull()
    }
  })

  it("drops a half-spoken answer when the mic is muted mid-sentence", () => {
    const recording = run([{ type: "SPEECH_START" }], ready)

    const muted = studioReducer(recording, { type: "MUTE_TOGGLED" })

    expect(muted.muted).toBe(true)
    expect(muted.vadStatus).toBe("muted")
    expect(muted.phase).toBe("listening")
    expect(muted.level).toBe(0)
  })

  it("unmutes back to listening", () => {
    const state = run([{ type: "MUTE_TOGGLED" }, { type: "MUTE_TOGGLED" }], ready)

    expect(state.muted).toBe(false)
    expect(state.vadStatus).toBe("listening")
  })

  it("keeps the same object when the level has not moved", () => {
    // The meter re-renders on every animation frame otherwise.
    const state = studioReducer(ready, { type: "LEVEL", level: 0 })

    expect(state).toBe(ready)
  })

  it("freezes once the session is over", () => {
    const done = run([{ type: "FINISHED" }], ready)

    expect(done.phase).toBe("completed")
    expect(studioReducer(done, { type: "SPEECH_START" })).toBe(done)
    expect(studioReducer(done, { type: "AI_DELTA", text: "x", elapsedMs: 1 })).toBe(
      done
    )
  })

  it("drops an empty reply rather than adding a blank bubble", () => {
    const state = run(
      [{ type: "TRANSCRIBED", text: "bonjour" }, { type: "AI_DONE" }],
      ready
    )

    expect(state.messages).toHaveLength(1)
  })
})
