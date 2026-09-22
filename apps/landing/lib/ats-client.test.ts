import { describe, expect, it } from "vitest"

import { fr } from "@/content/fr"
import {
  MAX_CV_BYTES,
  cvRejectionReason,
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
  it("prefers the message the API sent", () => {
    expect(
      scanErrorMessage({ message: "Le fichier est illisible.", status: 422 }, ats)
    ).toBe("Le fichier est illisible.")
  })

  it("explains a rate limit", () => {
    expect(scanErrorMessage({ message: null, status: 429 }, ats)).toBe(
      ats.errors.tooManyRequests
    )
  })

  it("explains an exhausted budget", () => {
    expect(scanErrorMessage({ message: null, status: 503 }, ats)).toBe(
      ats.errors.unavailable
    )
  })

  it("explains an expired scan", () => {
    expect(scanErrorMessage({ message: null, status: 410 }, ats)).toBe(
      ats.errors.expired
    )
  })

  it("explains an oversized upload", () => {
    expect(scanErrorMessage({ message: null, status: 413 }, ats)).toBe(
      ats.upload.tooLarge
    )
  })

  it("falls back to the generic message for an unexpected status", () => {
    expect(scanErrorMessage({ message: null, status: 418 }, ats)).toBe(
      ats.errors.generic
    )
  })

  /** Not an API failure at all: the request never got an answer. */
  it("reports a network failure when the error is not from the API", () => {
    expect(scanErrorMessage(new Error("offline"), ats)).toBe(ats.errors.network)
    expect(scanErrorMessage(undefined, ats)).toBe(ats.errors.network)
  })
})
