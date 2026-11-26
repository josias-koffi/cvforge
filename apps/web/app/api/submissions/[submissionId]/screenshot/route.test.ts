import { beforeEach, describe, expect, it, vi } from "vitest"

const apiRequest = vi.hoisted(() => vi.fn())
vi.mock("@/lib/api", () => ({ apiRequest }))

const { GET } = await import("./route")
const ID = "0b8f1c1e-2a3b-4c5d-8e9f-0a1b2c3d4e5f"
const call = (submissionId: string) =>
  GET(new Request("http://x"), { params: Promise.resolve({ submissionId }) })

beforeEach(() => apiRequest.mockReset())

describe("GET /api/submissions/:id/screenshot", () => {
  it("passes the image on with the session cookie", async () => {
    apiRequest.mockResolvedValue(
      new Response(new Uint8Array([255, 216]), { headers: { "content-type": "image/jpeg" } })
    )
    const response = await call(ID)
    expect(apiRequest).toHaveBeenCalledWith(`/applications/submissions/${ID}/screenshot`)
    expect(response.headers.get("content-type")).toBe("image/jpeg")
    expect(response.headers.get("x-content-type-options")).toBe("nosniff")
  })

  it("never relays anything but an image, nor a malformed id", async () => {
    expect((await call("../../admin")).status).toBe(404)
    expect(apiRequest).not.toHaveBeenCalled()

    apiRequest.mockResolvedValue(new Response("{}", { headers: { "content-type": "application/json" } }))
    expect((await call(ID)).status).toBe(404)
    apiRequest.mockResolvedValue(new Response(null, { status: 401 }))
    expect((await call(ID)).status).toBe(401)
  })
})
