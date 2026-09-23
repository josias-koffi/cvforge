import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import {
  fromLines,
  LinesTextarea,
} from "@/components/job-search/search-project-fields"

describe("fromLines", () => {
  it("keeps one trimmed entry per non-blank line", () => {
    expect(fromLines("  Ingénieur logiciel \n\n Développeur ")).toEqual([
      "Ingénieur logiciel",
      "Développeur",
    ])
  })
})

describe("LinesTextarea", () => {
  it("shows the list one entry per line", () => {
    const html = renderToStaticMarkup(
      <LinesTextarea
        id="roles"
        placeholder=""
        values={["Développeur", "Ingénieur logiciel"]}
        onChange={() => {}}
      />
    )

    expect(html).toContain("Développeur\nIngénieur logiciel")
  })
})
