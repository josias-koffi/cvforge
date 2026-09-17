import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/api", () => ({
  api: vi.fn().mockResolvedValue({ registry: null }),
}))

const { loadRegistry, unsavedProfileId } = await import("@/lib/profile")

describe("loadRegistry", () => {
  it("gives the same starter profile id on every call", async () => {
    // The editor is keyed on the profile id. A fresh uuid per render remounts
    // the form and drops unsaved edits — what emptied the fields after a CV
    // import revalidated the layout.
    const first = await loadRegistry("me@example.com")
    const second = await loadRegistry("me@example.com")

    expect(first.profiles[0]!.id).toBe(second.profiles[0]!.id)
    expect(first.activeProfileId).toBe(first.profiles[0]!.id)
  })

  it("seeds the starter profile with the user's email", async () => {
    const registry = await loadRegistry("me@example.com")

    expect(registry.profiles[0]!.identity.email).toBe("me@example.com")
    expect(registry.version).toBe(2)
  })
})

describe("unsavedProfileId", () => {
  it("differs between users", () => {
    expect(unsavedProfileId("me@example.com")).not.toBe(
      unsavedProfileId("other@example.com"),
    )
  })

  it("ignores case and surrounding spaces, as the API does", () => {
    expect(unsavedProfileId(" Me@Example.com ")).toBe(
      unsavedProfileId("me@example.com"),
    )
  })
})
