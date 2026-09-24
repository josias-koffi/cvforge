import { afterEach, describe, expect, it, vi } from "vitest"

import { publicErrorCodes } from "@cvforge/types"

import { en } from "@/content/en"
import { fr } from "@/content/fr"
import {
  MAX_CV_BYTES,
  cvRejectionReason,
  postScan,
  scanErrorMessage,
} from "@/lib/ats-client"

function makeFile(name: string, size: number) {
  const file = new File(["x"], name)

  Object.defineProperty(file, "size", { value: size })

  return file
}

describe("cvRejectionReason", () => {
  it("accepts a PDF within the size cap", () => {
    expect(cvRejectionReason(makeFile("cv.pdf", 1024))).toBeNull()
  })

  it("accepts a DOCX", () => {
    expect(cvRejectionReason(makeFile("cv.docx", 1024))).toBeNull()
  })

  it("is case-insensitive about the extension", () => {
    expect(cvRejectionReason(makeFile("CV.PDF", 1024))).toBeNull()
  })

  it("refuses anything else", () => {
    expect(cvRejectionReason(makeFile("cv.txt", 1024))).toBe("wrongType")
    expect(cvRejectionReason(makeFile("cv", 1024))).toBe("wrongType")
  })

  /** Size first: a 9 MB text file should say it is too large, not wrong type. */
  it("refuses a file over the cap", () => {
    expect(cvRejectionReason(makeFile("cv.pdf", MAX_CV_BYTES + 1))).toBe(
      "tooLarge"
    )
  })

  it("accepts a file exactly at the cap", () => {
    expect(cvRejectionReason(makeFile("cv.pdf", MAX_CV_BYTES))).toBeNull()
  })
})

describe("scanErrorMessage", () => {
  const ats = fr.ats

  /**
   * The API's own message is already localised and says precisely what
   * happened, so it wins over any generic wording here.
   */
  /** Never the API's message: it is French whatever the page's language. */
  it("words a named refusal in the page's language", () => {
    expect(
      scanErrorMessage({ code: "INVALID_EMAIL", status: 400 }, en.ats)
    ).toBe(en.ats.errors.invalidEmail)
    expect(
      scanErrorMessage({ code: "CV_FILE_UNSUPPORTED", status: 400 }, ats)
    ).toBe(ats.upload.wrongType)
  })

  it.each(publicErrorCodes)("words %s in both languages", (code) => {
    expect(scanErrorMessage({ code, status: 400 }, ats)).toBeTruthy()
    expect(scanErrorMessage({ code, status: 400 }, en.ats)).toBeTruthy()
    expect(scanErrorMessage({ code, status: 400 }, en.ats)).not.toBe(
      scanErrorMessage({ code, status: 400 }, ats)
    )
  })

  it("explains a rate limit", () => {
    expect(scanErrorMessage({ code: null, status: 429 }, ats)).toBe(
      ats.errors.tooManyRequests
    )
  })

  it("explains an exhausted budget", () => {
    expect(scanErrorMessage({ code: null, status: 503 }, ats)).toBe(
      ats.errors.unavailable
    )
  })

  it("explains an expired scan", () => {
    expect(scanErrorMessage({ code: null, status: 410 }, ats)).toBe(
      ats.errors.expired
    )
  })

  it("explains an oversized upload", () => {
    expect(scanErrorMessage({ code: null, status: 413 }, ats)).toBe(
      ats.upload.tooLarge
    )
  })

  it("falls back to the generic message for an unexpected status", () => {
    expect(scanErrorMessage({ code: null, status: 418 }, ats)).toBe(
      ats.errors.generic
    )
  })

  /** Not an API failure at all: the request never got an answer. */
  it("reports a network failure when the error is not from the API", () => {
    expect(scanErrorMessage(new Error("offline"), ats)).toBe(ats.errors.network)
    expect(scanErrorMessage(undefined, ats)).toBe(ats.errors.network)
  })
})

describe("postScan", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  /** A scan made on the English page is stored in English (US-134). */
  it("sends the page's language with the file", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ scanId: "x" })))
    vi.stubGlobal("fetch", fetchMock)

    await postScan(makeFile("cv.pdf", 10), null, "en")

    const body = fetchMock.mock.calls[0]![1].body as FormData
    expect(body.get("locale")).toBe("en")
    expect(body.has("offerText")).toBe(false)
  })

  it("carries the API's code, never its message, on a refusal", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ code: "CV_NOT_ENOUGH_TEXT", message: "Ce CV..." }),
            { status: 422 }
          )
        )
    )

    await expect(postScan(makeFile("cv.pdf", 10), null, "en")).rejects.toEqual({
      code: "CV_NOT_ENOUGH_TEXT",
      status: 422,
    })
  })
})
