import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { DeltaBadge } from "@/components/admin/metrics/delta-badge"

describe("DeltaBadge", () => {
  it("shows a rise as good by default", () => {
    const html = renderToStaticMarkup(
      <DeltaBadge kpi={{ previous: 100, value: 150 }} />
    )

    expect(html).toContain("+50 %")
    expect(html).toContain('data-variant="success"')
    expect(html).toContain("par rapport à la période précédente")
  })

  /** More AI cost is bad news: green must keep meaning good. */
  it("flips the colour when up is bad", () => {
    const up = renderToStaticMarkup(
      <DeltaBadge kpi={{ previous: 100, value: 150 }} upIsBad />
    )
    const down = renderToStaticMarkup(
      <DeltaBadge kpi={{ previous: 100, value: 50 }} upIsBad />
    )

    expect(up).toContain('data-variant="destructive"')
    expect(down).toContain('data-variant="success"')
    expect(down).toContain("−50 %")
  })

  it("stays neutral when flat", () => {
    const html = renderToStaticMarkup(
      <DeltaBadge kpi={{ previous: 100, value: 100 }} />
    )

    expect(html).toContain('data-variant="outline"')
    expect(html).toContain("0 %")
  })

  it("is hidden without a previous figure", () => {
    expect(
      renderToStaticMarkup(<DeltaBadge kpi={{ previous: null, value: 10 }} />)
    ).toBe("")
    expect(
      renderToStaticMarkup(<DeltaBadge kpi={{ previous: 0, value: 10 }} />)
    ).toBe("")
  })
})
