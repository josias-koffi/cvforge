import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

const { applyFromAlert } = vi.hoisted(() => ({ applyFromAlert: vi.fn() }))
vi.mock("@/app/(app)/offres-du-jour/actions", () => ({ applyFromAlert }))

import { ApplyFromAlert } from "@/components/job-search/apply-from-alert"

describe("ApplyFromAlert (US-167)", () => {
  it("says what is happening, and starts nothing while rendering on the server", () => {
    const html = renderToStaticMarkup(<ApplyFromAlert jobId="job-1" />)

    expect(html).toContain("On prépare votre candidature")
    expect(html).toContain("votre CV adapté")
    // Only the browser starts it: a scanner fetching the link creates nothing.
    expect(applyFromAlert).not.toHaveBeenCalled()
  })
})
