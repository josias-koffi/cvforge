import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ api: vi.fn(), revalidatePath: vi.fn() }))

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock("@/lib/session", () => ({
  requireSession: vi.fn(async () => ({ email: "user@example.com" })),
}))
vi.mock("@/lib/api", async (original) => ({
  ...(await original<typeof import("@/lib/api")>()),
  api: mocks.api,
}))

const { saveScreeningAnswers } = await import(
  "@/app/(app)/profile/reponses/actions"
)
const { ApiError } = await import("@/lib/api")

beforeEach(() => {
  mocks.api.mockReset()
  mocks.revalidatePath.mockReset()
})

describe("saveScreeningAnswers", () => {
  it("sends the whole form and refreshes the page", async () => {
    mocks.api.mockResolvedValue({})
    const answers = { custom: [], known: { noticePeriod: "1 mois" } }

    expect(await saveScreeningAnswers(answers)).toEqual({
      message: "Réponses enregistrées.",
      ok: true,
    })
    expect(mocks.api).toHaveBeenCalledWith("/screening-answers", {
      body: answers,
      method: "PUT",
    })
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/profile/reponses")
  })

  it("passes the API's refusal on", async () => {
    mocks.api.mockRejectedValue(new ApiError(400, "Réponse : 1000 caractères au plus."))
    expect(
      await saveScreeningAnswers({ custom: [], known: {} })
    ).toEqual({ message: "Réponse : 1000 caractères au plus.", ok: false })
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })
})
