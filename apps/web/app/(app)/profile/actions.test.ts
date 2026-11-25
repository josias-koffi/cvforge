import { beforeEach, describe, expect, it, vi } from "vitest"

import { createEmptyProfile, type BaseProfile } from "@/lib/profile-model"

const store = vi.hoisted(() => ({
  loadRegistry: vi.fn(),
  writeRegistry: vi.fn(),
}))

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/session", () => ({
  requireSession: vi.fn(async () => ({ email: "user@example.com" })),
}))
vi.mock("@/lib/profile", () => ({
  loadRegistry: store.loadRegistry,
  writeRegistry: store.writeRegistry,
}))

const { saveProfile } = await import("@/app/(app)/profile/actions")

const STORED: BaseProfile = {
  ...createEmptyProfile("user@example.com"),
  id: "p1",
  meta: {
    lastSavedAt: "2026-11-25T18:46:24.000Z",
    maxProfiles: null,
    source: "storage",
  },
}

beforeEach(() => {
  store.writeRegistry.mockReset()
  store.loadRegistry.mockResolvedValue({
    activeProfileId: "p1",
    profiles: [STORED],
    version: 2,
  })
})

describe("saveProfile", () => {
  it("saves over the version the editor loaded", async () => {
    const result = await saveProfile(
      { ...STORED, headline: "Développeur" },
      STORED.meta.lastSavedAt
    )

    expect(result.ok).toBe(true)
    expect(result).toHaveProperty("lastSavedAt")
    expect(store.writeRegistry).toHaveBeenCalledOnce()
  })

  /**
   * An agent added an experience through the MCP server while the page was
   * open: saving the stale form used to erase it.
   */
  it("refuses to overwrite a profile saved elsewhere since it was loaded", async () => {
    const result = await saveProfile(
      { ...STORED, headline: "Développeur" },
      "2026-11-25T18:00:00.000Z"
    )

    expect(result.ok).toBe(false)
    expect(result.message).toMatch(/modifié ailleurs/)
    expect(store.writeRegistry).not.toHaveBeenCalled()
  })

  it("skips the check when the caller gives no version (onboarding)", async () => {
    const result = await saveProfile({ ...STORED, headline: "Développeur" })

    expect(result.ok).toBe(true)
  })
})
