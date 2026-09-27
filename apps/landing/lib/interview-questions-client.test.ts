import { afterEach, describe, expect, it, vi } from "vitest"

import { en } from "@/content/en"
import { fr } from "@/content/fr"
import { scanErrorMessage } from "@/lib/ats-client"
import {
  postInterviewQuestions,
  postInterviewQuestionsLead,
} from "@/lib/interview-questions-client"

afterEach(() => {
  vi.unstubAllGlobals()
})

function refuseWith(status: number, code: string | null) {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ code }), { status }))
  )
}

describe("postInterviewQuestions", () => {
  it("posts the offer and the page's language to the landing's own route", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ questions: [] })))
    vi.stubGlobal("fetch", fetchMock)

    await expect(postInterviewQuestions("Une offre", "en")).resolves.toEqual({
      questions: [],
    })

    const [url, init] = fetchMock.mock.calls[0]!

    expect(url).toBe("/api/interview-questions")
    expect(JSON.parse(init.body as string)).toEqual({
      locale: "en",
      offerText: "Une offre",
    })
  })

  /** A provider outage reads as the tool's own message, never a raw 500. */
  it.each([
    ["fr", fr],
    ["en", en],
  ] as const)("words an unavailable generator in %s", async (_locale, dict) => {
    refuseWith(503, "QUESTIONS_UNAVAILABLE")

    const failure = await postInterviewQuestions("offre", "fr").catch(
      (error: unknown) => error
    )

    expect(scanErrorMessage(failure, dict.ats)).toBe(
      dict.ats.errors.questionsUnavailable
    )
  })

  it("words a spent daily budget apart from an outage", async () => {
    refuseWith(503, "BUDGET_EXHAUSTED")

    const failure = await postInterviewQuestions("offre", "fr").catch(
      (error: unknown) => error
    )

    expect(scanErrorMessage(failure, fr.ats)).toBe(fr.ats.errors.unavailable)
  })
})

describe("postInterviewQuestionsLead", () => {
  it("sends the address, the consent and the offer", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ magicLinkSent: true }), { status: 202 })
      )
    vi.stubGlobal("fetch", fetchMock)

    await postInterviewQuestionsLead("a@b.fr", true, "Une offre")

    const [url, init] = fetchMock.mock.calls[0]!

    expect(url).toBe("/api/interview-questions/lead")
    expect(JSON.parse(init.body as string)).toEqual({
      consentAccepted: true,
      email: "a@b.fr",
      offerText: "Une offre",
    })
  })
})
