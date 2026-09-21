import { applicationStatuses } from "@cvforge/types"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { StatusBadge } from "@/components/offers/status-badge"
import { statusLabels } from "@/lib/format"

describe("StatusBadge", () => {
  it("renders the French label of every application status", () => {
    for (const status of applicationStatuses) {
      const markup = renderToStaticMarkup(<StatusBadge status={status} />)

      expect(markup).toContain(statusLabels[status])
    }
  })
})
