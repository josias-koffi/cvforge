import { describe, expect, it } from "vitest"

import nextConfig, { resolveNextDistDir } from "../next.config"

describe("landing next config", () => {
  it("builds a standalone server without overriding distDir by default", () => {
    expect(nextConfig.output).toBe("standalone")
    expect(nextConfig.distDir).toBeUndefined()
  })

  it("accepts a relative NEXT_DIST_DIR", () => {
    expect(resolveNextDistDir(" tmp/cvforge-landing-next ")).toBe(
      "tmp/cvforge-landing-next"
    )
  })

  it("ignores absolute or escaping NEXT_DIST_DIR values", () => {
    expect(resolveNextDistDir("/tmp/cvforge-landing-next")).toBeUndefined()
    expect(resolveNextDistDir("../outside")).toBeUndefined()
    expect(resolveNextDistDir("a/../../b")).toBeUndefined()
    expect(resolveNextDistDir("")).toBeUndefined()
  })
})
