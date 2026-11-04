import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { draftToValue } from "@/components/documents/date-field"
import { ListEditor, type FieldSpec } from "@/components/documents/list-editor"

type Entry = { date?: string; title: string; year: string }

const fields: FieldSpec<Entry>[] = [
  { key: "title", label: "Certification" },
  { type: "date", key: "date", legacyKey: "year", label: "Date" },
]

function render(items: Entry[]) {
  return renderToStaticMarkup(
    <ListEditor
      id="cert"
      items={items}
      fields={fields}
      onChange={() => {}}
      itemTitle={(item) => item.title}
      addLabel="Ajouter"
      createItem={() => ({ title: "", year: "" })}
    />
  )
}

describe("ListEditor", () => {
  it("renders a drag handle per item and keeps legacy free text visible", () => {
    const html = render([
      { title: "AWS", year: "Printemps 2020" },
      { title: "GCP", date: "2022-03", year: "mars 2022" },
    ])

    expect(html.match(/Déplacer/g)).toHaveLength(2)
    expect(html).toContain("Printemps 2020")
    expect(html).toContain("2022")
  })
})

describe("draftToValue", () => {
  it("only emits complete valid dates", () => {
    expect(draftToValue({ day: "", month: "", precision: "year", year: "2022" })).toBe("2022")
    expect(draftToValue({ day: "", month: "3", precision: "month", year: "2022" })).toBe("2022-03")
    expect(draftToValue({ day: "31", month: "2", precision: "day", year: "2022" })).toBe("")
    expect(draftToValue({ day: "", month: "", precision: "month", year: "2022" })).toBe("")
    expect(draftToValue({ day: "", month: "", precision: "year", year: "20" })).toBe("")
  })
})
