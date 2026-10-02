import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { StreamsSummary } from "@/components/admin/job-search/streams-summary"

describe("StreamsSummary", () => {
  it("says when nothing ran yet", () => {
    const html = renderToStaticMarkup(<StreamsSummary streams={{}} />)

    expect(html.match(/pas encore lancé/g)).toHaveLength(2)
    expect(html).not.toContain('role="alert"')
  })

  it("warns about companies the cycle budget left to the daily pass", () => {
    const html = renderToStaticMarkup(
      <StreamsSummary
        streams={{
          boards_frequent: {
            at: "2026-10-01T10:00:00Z",
            boardsRead: 900,
            boardsSelected: 900,
            newListings: 12,
            overflow: { lever: 40 },
            paused: ["greenhouse/acme (429)"],
            status: "done",
          },
        }}
      />
    )

    expect(html).toContain("Budget de la passe fréquente dépassé")
    expect(html).toContain("40 entreprises")
    expect(html).toContain("greenhouse/acme (429)")
  })
})
