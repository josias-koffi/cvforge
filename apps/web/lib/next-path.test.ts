import { describe, expect, it } from "vitest"

import { safeNextPath } from "@/lib/next-path"

describe("safeNextPath", () => {
  it("keeps a path of this app", () => {
    expect(safeNextPath("/analyses-ats/abc")).toBe("/analyses-ats/abc")
  })

  it.each([
    ["nothing", undefined],
    ["an empty value", ""],
    ["an absolute URL", "https://evil.example/phish"],
    ["a protocol-relative URL", "//evil.example"],
    ["a backslash trick", "/\\evil.example"],
    ["a tab the browser would drop", "/\t/evil.example"],
    ["a newline the browser would drop", "/\n/evil.example"],
    ["a null byte", "/dashboard\u0000"],
    ["a dot segment before a double slash", "/.//evil.example"],
    ["a parent segment before a double slash", "/..//evil.example"],
    ["a segment undone before a double slash", "/a/..//evil.example"],
    ["an encoded dot segment", "/%2e//evil.example"],
    ["an encoded parent segment", "/%2e%2e//evil.example"],
    ["a dot segment before a backslash", "/./\\evil.example"],
    ["a dot and backslash mix", "/.\\/evil.example"],
    ["a relative path", "analyses-ats/abc"],
  ])("refuses %s", (_label, value) => {
    expect(safeNextPath(value)).toBeNull()
  })

  it("keeps the query of a path of this app", () => {
    expect(safeNextPath("/analyses-ats/abc?from=email")).toBe(
      "/analyses-ats/abc?from=email"
    )
  })

  it("leaves an encoded slash encoded, on this origin", () => {
    expect(safeNextPath("/%2F%2Fevil.example")).toBe("/%2F%2Fevil.example")
  })

  it("reads the first of repeated parameters", () => {
    expect(safeNextPath(["/dashboard", "//evil.example"])).toBe("/dashboard")
  })
})
