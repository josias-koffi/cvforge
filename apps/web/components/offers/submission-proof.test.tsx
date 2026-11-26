import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { SubmissionProof } from "./submission-proof"

const base = {
  applicationId: "a1",
  confirmationUrl: "https://jobs.example.com/thanks",
  confirmed: true,
  documents: ["CV Ana.pdf"],
  fields: [{ label: "E-mail", value: "ana@example.com" }],
  formUrl: "https://jobs.example.com/apply",
  hasScreenshot: true,
  id: "s1",
  submittedAt: "2026-11-26T11:00:00.000Z",
}

describe("SubmissionProof", () => {
  it("shows nothing without a sending", () => {
    expect(renderToStaticMarkup(<SubmissionProof submissions={[]} />)).toBe("")
  })

  it("shows the confirmed sending, its documents, fields and screenshot", () => {
    const html = renderToStaticMarkup(<SubmissionProof submissions={[base]} />)
    expect(html).toContain("Envoi confirmé")
    expect(html).toContain("jobs.example.com")
    expect(html).toContain("CV Ana.pdf")
    expect(html).toContain("1 champ(s) rempli(s)")
    expect(html).toContain('src="/api/submissions/s1/screenshot"')
  })

  it("flags a sending without confirmation as to check", () => {
    const html = renderToStaticMarkup(
      <SubmissionProof
        submissions={[{ ...base, confirmationUrl: null, confirmed: false, hasScreenshot: false }]}
      />
    )
    expect(html).toContain("À vérifier")
    expect(html).not.toContain("<img")
  })
})
