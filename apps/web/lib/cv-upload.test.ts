import { describe, expect, it } from "vitest"

import { CV_MAX_BYTES, cvRejectionReason } from "@/lib/cv-upload"

function fileOf(name: string, size: number) {
  const file = new File(["x"], name)

  Object.defineProperty(file, "size", { value: size })
  return file
}

describe("cvRejectionReason", () => {
  it("accepts a PDF or a DOCX under the limit", () => {
    expect(cvRejectionReason(fileOf("cv.pdf", 1024))).toBeNull()
    expect(cvRejectionReason(fileOf("CV.DOCX", 1024))).toBeNull()
  })

  it("rejects another format before it costs credits", () => {
    // The API debits on extract, so a doomed file must never leave the browser.
    expect(cvRejectionReason(fileOf("cv.png", 1024))).toContain("ni un PDF ni un DOCX")
  })

  it("rejects a file over 5 Mo and names its size", () => {
    expect(cvRejectionReason(fileOf("cv.pdf", CV_MAX_BYTES + 1))).toContain("5 Mo")
  })
})
