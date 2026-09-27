import { describe, expect, it } from "vitest"

import { toStudioEvents } from "@/lib/interview/realtime-events"

const at = () => 1_000

describe("toStudioEvents", () => {
  it("follows the candidate's turn as the call detects it", () => {
    expect(toStudioEvents({ type: "input_audio_buffer.speech_started" })).toEqual([
      { type: "USER_SPEECH_START" },
    ])
    expect(
      toStudioEvents(
        { item_id: "u1", type: "input_audio_buffer.speech_stopped" },
        at
      )
    ).toEqual([{ atMs: 1_000, itemId: "u1", type: "USER_SPEECH_END" }])
  })

  it("files the candidate's words under their own answer", () => {
    expect(
      toStudioEvents({
        item_id: "u1",
        transcript: "Bonjour.",
        type: "conversation.item.input_audio_transcription.completed",
      })
    ).toEqual([{ itemId: "u1", text: "Bonjour.", type: "TRANSCRIBED" }])
    // A failed transcription clears the placeholder rather than leaving it.
    expect(
      toStudioEvents({
        item_id: "u1",
        type: "conversation.item.input_audio_transcription.failed",
      })
    ).toEqual([{ itemId: "u1", text: "", type: "TRANSCRIBED" }])
  })

  it("streams the recruiter's words and times its voice", () => {
    expect(
      toStudioEvents({ delta: "Bon", type: "response.output_audio_transcript.delta" })
    ).toEqual([{ text: "Bon", type: "AI_DELTA" }])
    expect(toStudioEvents({ type: "output_audio_buffer.started" }, at)).toEqual([
      { atMs: 1_000, type: "AI_AUDIO_STARTED" },
    ])
    expect(toStudioEvents({ type: "response.done" })).toEqual([{ type: "AI_DONE" }])
  })

  it("hears the recruiter end the interview through its tool", () => {
    expect(
      toStudioEvents({
        response: {
          output: [
            { type: "message" },
            { name: "end_interview", type: "function_call" },
          ],
        },
        type: "response.done",
      })
    ).toEqual([{ type: "CONCLUDED" }, { type: "AI_DONE" }])
  })

  it("hands the floor back whether the voice finished or was cut off", () => {
    expect(toStudioEvents({ type: "output_audio_buffer.stopped" })).toEqual([
      { type: "VOICE_DONE" },
    ])
    expect(toStudioEvents({ type: "output_audio_buffer.cleared" })).toEqual([
      { type: "VOICE_DONE" },
    ])
  })

  it("surfaces a real error but not a cancellation race", () => {
    expect(
      toStudioEvents({ error: { message: "quota" }, type: "error" })[0]
    ).toMatchObject({ type: "CALL_ERROR" })
    expect(
      toStudioEvents({
        error: { code: "response_cancel_not_active", message: "x" },
        type: "error",
      })
    ).toEqual([])
  })

  it("ignores what the studio has no use for", () => {
    expect(toStudioEvents({ type: "session.updated" })).toEqual([])
    expect(toStudioEvents(null)).toEqual([])
    expect(toStudioEvents("text")).toEqual([])
  })
})
