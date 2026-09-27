import { describe, expect, it } from "vitest"

import { comboboxAction } from "@/components/job-market/combobox-keys"

describe("comboboxAction", () => {
  it("moves down and wraps to the first option", () => {
    expect(comboboxAction("ArrowDown", -1, 3, true)).toEqual({
      index: 0,
      type: "move",
    })
    expect(comboboxAction("ArrowDown", 2, 3, true)).toEqual({
      index: 0,
      type: "move",
    })
  })

  it("moves up and wraps to the last option", () => {
    expect(comboboxAction("ArrowUp", -1, 3, true)).toEqual({
      index: 2,
      type: "move",
    })
    expect(comboboxAction("ArrowUp", 1, 3, true)).toEqual({
      index: 0,
      type: "move",
    })
  })

  it("picks the highlighted option on Enter, and nothing without one", () => {
    expect(comboboxAction("Enter", 1, 3, true)).toEqual({
      index: 1,
      type: "pick",
    })
    expect(comboboxAction("Enter", -1, 3, true)).toBeNull()
    // Closed list: Enter submits the form as usual.
    expect(comboboxAction("Enter", 1, 3, false)).toBeNull()
  })

  it("closes on Escape, and lets other keys through", () => {
    expect(comboboxAction("Escape", 0, 3, true)).toEqual({ type: "close" })
    expect(comboboxAction("Escape", 0, 3, false)).toBeNull()
    expect(comboboxAction("a", 0, 3, true)).toBeNull()
    expect(comboboxAction("ArrowDown", -1, 0, true)).toBeNull()
  })
})
