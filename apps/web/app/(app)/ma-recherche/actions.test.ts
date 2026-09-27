import { emptySearchProject, type SearchProject } from "@cvforge/types"
import { beforeEach, describe, expect, it, vi } from "vitest"

const STORED: SearchProject = {
  ...emptySearchProject("p1"),
  digestEnabled: true,
  emailEnabled: false,
  targetRoles: ["Boulanger"],
}

const store = vi.hoisted(() => ({
  readSearchProject: vi.fn(),
  writeSearchProject: vi.fn(),
}))

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/profile-competences", () => ({
  writeCompetenceDismissal: vi.fn(),
}))
vi.mock("@/lib/search-project", async (original) => ({
  ...(await original<typeof import("@/lib/search-project")>()),
  readSearchProject: store.readSearchProject,
  writeSearchProject: store.writeSearchProject,
}))

const { saveSearchAlerts, saveSearchProject } =
  await import("@/app/(app)/ma-recherche/actions")

beforeEach(() => {
  store.readSearchProject.mockResolvedValue({ rome: [], searchProject: STORED })
  store.writeSearchProject.mockImplementation(async (searchProject) => ({
    rome: [],
    searchProject,
  }))
})

describe("saveSearchAlerts", () => {
  it("writes the alerts on top of the stored criteria", async () => {
    const result = await saveSearchAlerts("p1", {
      aiRerankEnabled: true,
      digestEnabled: true,
      emailEnabled: true,
    })

    expect(store.writeSearchProject).toHaveBeenCalledWith({
      ...STORED,
      aiRerankEnabled: true,
      emailEnabled: true,
    })
    expect(result).toEqual({
      alerts: {
        aiRerankEnabled: true,
        digestEnabled: true,
        emailEnabled: true,
      },
      ok: true,
    })
  })
})

describe("saveSearchProject", () => {
  it("never writes back alerts from a criteria form left open", async () => {
    await saveSearchProject({
      ...STORED,
      digestEnabled: false,
      targetRoles: ["Pâtissier"],
    })

    expect(store.writeSearchProject).toHaveBeenCalledWith({
      ...STORED,
      targetRoles: ["Pâtissier"],
    })
  })
})
