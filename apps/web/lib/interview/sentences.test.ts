import { describe, expect, it } from "vitest"

import { drainSentences, flushSentences } from "@/lib/interview/sentences"

describe("drainSentences", () => {
  it("returns nothing while the sentence is unfinished", () => {
    expect(drainSentences("Parlez-moi de votre")).toEqual({
      sentences: [],
      rest: "Parlez-moi de votre",
    })
  })

  it("takes complete sentences and keeps the tail", () => {
    expect(drainSentences("Bonjour. Parlez-moi de vous")).toEqual({
      sentences: ["Bonjour."],
      rest: "Parlez-moi de vous",
    })
  })

  it("drains several at once", () => {
    const { sentences, rest } = drainSentences(
      "Bonjour ! Comment allez-vous ? Très bien"
    )

    expect(sentences).toEqual(["Bonjour !", "Comment allez-vous ?"])
    expect(rest).toBe("Très bien")
  })

  it("does not cut on a decimal point or an initial", () => {
    // Speaking "3" then "5 ans" separately would sound broken.
    expect(drainSentences("Environ 3.5 ans chez M.Dupont").sentences).toEqual([])
  })

  it("takes a sentence that ends the buffer with no trailing space", () => {
    expect(drainSentences("C'est noté.")).toEqual({
      sentences: ["C'est noté."],
      rest: "",
    })
  })

  it("handles an ellipsis", () => {
    expect(drainSentences("Hmm… et ensuite").sentences).toEqual(["Hmm…"])
  })
})

describe("flushSentences", () => {
  it("speaks whatever is left when the stream ends", () => {
    expect(flushSentences("sans ponctuation finale")).toEqual([
      "sans ponctuation finale",
    ])
  })

  it("says nothing for an empty tail", () => {
    expect(flushSentences("   ")).toEqual([])
  })
})
