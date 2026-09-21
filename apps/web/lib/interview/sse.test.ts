import { describe, expect, it } from "vitest"

import { createSseParser } from "@/lib/interview/sse"

const encode = (value: string) => new TextEncoder().encode(value)
const frame = (payload: unknown) => `data: ${JSON.stringify(payload)}\n\n`

describe("createSseParser", () => {
  it("reads several events out of one chunk", () => {
    const parser = createSseParser()

    const events = parser.push(
      encode(
        frame({ type: "chunk", text: "Bonjour" }) +
          frame({ type: "chunk", text: " à vous" })
      )
    )

    expect(events).toEqual([
      { type: "chunk", text: "Bonjour" },
      { type: "chunk", text: " à vous" },
    ])
  })

  it("holds a frame split across two reads until it is complete", () => {
    // This is the failure that reads as the interviewer swallowing words.
    const parser = createSseParser()
    const whole = frame({ type: "chunk", text: "une phrase" })
    const cut = Math.floor(whole.length / 2)

    expect(parser.push(encode(whole.slice(0, cut)))).toEqual([])
    expect(parser.push(encode(whole.slice(cut)))).toEqual([
      { type: "chunk", text: "une phrase" },
    ])
  })

  it("keeps multibyte characters intact across a read boundary", () => {
    const parser = createSseParser()
    const bytes = encode(frame({ type: "chunk", text: "café" }))
    const split = bytes.indexOf(0xc3) + 1 // mid "é"

    parser.push(bytes.slice(0, split))

    expect(parser.push(bytes.slice(split))).toEqual([
      { type: "chunk", text: "café" },
    ])
  })

  it("skips a malformed frame rather than ending the turn", () => {
    const parser = createSseParser()

    const events = parser.push(
      encode("data: {nope\n\n" + frame({ type: "done" }))
    )

    expect(events).toEqual([{ type: "done" }])
  })

  it("ignores comments, blank frames and the [DONE] sentinel", () => {
    const parser = createSseParser()

    expect(
      parser.push(encode(": keep-alive\n\ndata:\n\ndata: [DONE]\n\n"))
    ).toEqual([])
  })

  it("passes an error event through", () => {
    const parser = createSseParser()

    expect(
      parser.push(encode(frame({ type: "error", message: "coupé" })))
    ).toEqual([{ type: "error", message: "coupé" }])
  })
})
