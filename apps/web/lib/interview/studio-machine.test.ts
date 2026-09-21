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

  it("shuts the microphone while the recruiter's opening is on its way", () => {
    // The candidate must not be recorded answering a question nobody asked.
    const state = run([{ type: "AI_OPENING" }], ready)

    expect(state.phase).toBe("processing")
    expect(run([{ type: "SPEECH_START" }], state).phase).toBe("processing")
  })

  it("hands the floor back once the opening has been spoken", () => {
    const state = run(
      [
        { type: "AI_OPENING" },
        { type: "AI_AUDIO", atMs: 1700 },
        { type: "AI_DELTA", text: "Parlez-moi de vous.", atMs: 1700 },
        { type: "AI_DONE" },
        { type: "VOICE_DONE" },
      ],
      ready
    )

    expect(state.phase).toBe("listening")
    expect(state.messages.map((m) => [m.role, m.content])).toEqual([
      ["assistant", "Parlez-moi de vous."],
    ])
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
        { type: "SPEECH_END", atMs: 1000 },
        { type: "AI_AUDIO", atMs: 1800 },
        { type: "TRANSCRIBED", text: "J'ai mené la refonte." },
        { type: "AI_DELTA", text: "Très bien. ", atMs: 1800 },
        { type: "AI_DELTA", text: "Quel rôle ?", atMs: 2200 },
        { type: "AI_DONE" },
        { type: "VOICE_DONE" },
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

  it("keeps the microphone shut until the voice has actually stopped", () => {
    // The text stream finishing is not the voice finishing. Reopening on
    // AI_DONE let the speakers feed the recruiter back into the microphone,
    // and the candidate could not get a word in.
    const spoken = run(
      [
        { type: "AI_DELTA", text: "Et ensuite ?", atMs: 1700 },
        { type: "AI_DONE" },
      ],
      ready
    )

    expect(spoken.phase).toBe("speaking")
    expect(spoken.vadStatus).toBe("processing")
    // Speech arriving while the recruiter talks is its own echo: ignored.
    expect(studioReducer(spoken, { type: "SPEECH_START" }).phase).toBe("speaking")

    const done = studioReducer(spoken, { type: "VOICE_DONE" })

    expect(done.phase).toBe("listening")
    expect(done.vadStatus).toBe("listening")
  })

  it("ignores a voice ending that nobody was waiting for", () => {
    expect(studioReducer(ready, { type: "VOICE_DONE" })).toBe(ready)
  })

  it("times the first token, not the last", () => {
    const state = run(
      [
        { type: "SPEECH_START" },
        { type: "SPEECH_END", atMs: 1000 },
        { type: "AI_DELTA", text: "a", atMs: 1900 },
        { type: "AI_DELTA", text: "b", atMs: 2500 },
      ],
      ready
    )

    expect(state.firstTokenMs).toBe(900)
  })

  it("times the wait from the last word, not from the request", () => {
    // Encoding the answer and uploading a megabyte of audio happen inside the
    // silence the candidate sits through. Starting the clock at the fetch hid
    // them, so the strip flattered us.
    const state = run(
      [
        { type: "SPEECH_START" },
        { type: "SPEECH_END", atMs: 10_000 },
        { type: "AI_AUDIO", atMs: 11_900 },
      ],
      ready
    )

    expect(state.firstTokenMs).toBe(1900)
  })

  it("reports no latency for the opening: nothing preceded it", () => {
    const state = run(
      [{ type: "AI_OPENING" }, { type: "AI_AUDIO", atMs: 4000 }],
      ready
    )

    expect(state.firstTokenMs).toBeNull()
  })

  it("records what the candidate said without touching the phase", () => {
    // Transcription now runs beside the voice, so it can land mid-reply: the
    // audio events own the phase, this only appends the message.
    const speaking = run(
      [
        { type: "SPEECH_START" },
        { type: "SPEECH_END", atMs: 1000 },
        { type: "AI_AUDIO", atMs: 1900 },
        { type: "TRANSCRIBED", text: "J'ai mené la refonte." },
      ],
      ready
    )

    expect(speaking.phase).toBe("speaking")
    expect(speaking.messages.map((m) => m.content)).toEqual([
      "J'ai mené la refonte.",
    ])
  })

  it("ignores an empty transcription rather than adding a blank bubble", () => {
    const state = studioReducer(ready, { type: "TRANSCRIBED", text: "   " })

    expect(state).toBe(ready)
  })

  it("starts speaking on the first audio frame, and times it", () => {
    const state = run(
      [
        { type: "SPEECH_START" },
        { type: "SPEECH_END", atMs: 1000 },
        { type: "AI_AUDIO", atMs: 2100 },
        { type: "AI_AUDIO", atMs: 2400 },
      ],
      ready
    )

    expect(state.phase).toBe("speaking")
    expect(state.vadStatus).toBe("processing")
    // The first frame is what the candidate hears; later ones do not reset it.
    expect(state.firstTokenMs).toBe(1100)
  })

  it("clears the previous reply when a new answer begins", () => {
    const stale = { ...ready, streamingReply: "vieux texte", firstTokenMs: 900 }

    const state = run(
      [{ type: "SPEECH_START" }, { type: "SPEECH_END", atMs: 1000 }],
      stale
    )

    expect(state.streamingReply).toBe("")
    expect(state.firstTokenMs).toBeNull()
  })

  it("ignores speech while a segment is uploading or the recruiter is talking", () => {
    for (const phase of ["processing", "speaking"] as const) {
      const state = studioReducer({ ...ready, phase }, { type: "SPEECH_START" })

      expect(state.phase).toBe(phase)
    }
  })

  it("gives the floor back when a noise turns out not to be an answer", () => {
    const recording = run([{ type: "SPEECH_START" }], ready)

    const aborted = studioReducer(recording, { type: "SPEECH_ABORTED" })

    expect(aborted.phase).toBe("listening")
    expect(aborted.vadStatus).toBe("listening")
    // Nothing was said, so nothing is recorded and no turn is spent.
    expect(aborted.messages).toHaveLength(0)
    expect(aborted.error).toBeNull()
  })

  it("ignores an abort while the recruiter is talking", () => {
    const speaking = { ...ready, phase: "speaking" as const }

    expect(studioReducer(speaking, { type: "SPEECH_ABORTED" })).toBe(speaking)
  })

  it("ignores an end of speech that never started", () => {
    expect(studioReducer(ready, { type: "SPEECH_END", atMs: 1000 }).phase).toBe("listening")
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
    expect(studioReducer(done, { type: "AI_DELTA", text: "x", atMs: 1001 })).toBe(
      done
    )
  })

  it("takes the interview's start from the server, once", () => {
    // The countdown is derived from this. It arrives on the first turn, not
    // at session creation, and a later turn repeating it must not restart it.
    const started = run(
      [{ type: "SESSION_STARTED", startedAt: "2026-04-24T13:00:00.000Z" }],
      ready
    )
    expect(started.startedAt).toBe("2026-04-24T13:00:00.000Z")

    const later = studioReducer(started, {
      startedAt: "2026-04-24T13:05:00.000Z",
      type: "SESSION_STARTED",
    })
    expect(later).toBe(started)
  })

  it("drops an empty reply rather than adding a blank bubble", () => {
    const state = run(
      [
        { type: "TRANSCRIBED", text: "bonjour" },
        { type: "AI_DONE" },
        { type: "VOICE_DONE" },
      ],
      ready
    )

    expect(state.messages).toHaveLength(1)
  })
})
