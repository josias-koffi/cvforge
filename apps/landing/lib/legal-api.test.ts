import type { PublicLegalDocument } from "@cvforge/types"
import { describe, expect, it, vi } from "vitest"

import { fetchLegalDocument } from "@/lib/legal-api"

const env = (values: Record<string, string>) =>
  values as unknown as NodeJS.ProcessEnv

const document: PublicLegalDocument = {
  body: { en: "Body", fr: "Corps" },
  publishedAt: "2026-09-21T00:00:00.000Z",
  slug: "terms",
  title: { en: "Terms of use", fr: "Conditions d'utilisation" },
  version: 1,
}

describe("fetchLegalDocument", () => {
  it("asks the API for the document, and caches the answer", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ document }))

    await expect(
      fetchLegalDocument("terms", env({ API_INTERNAL_URL: "https://api" }), fetcher)
    ).resolves.toEqual(document)

    expect(fetcher).toHaveBeenCalledWith("https://api/public/legal/terms", {
      next: { revalidate: 300 },
    })
  })

  // A legal page showing nothing would be worse than no page at all: the
  // caller turns this null into a 404.
  it("returns null rather than an empty contract", async () => {
    const failures = [
      vi.fn().mockResolvedValue(new Response("", { status: 404 })),
      vi.fn().mockResolvedValue(Response.json({})),
      vi.fn().mockRejectedValue(new Error("network down")),
    ]

    for (const fetcher of failures) {
      await expect(fetchLegalDocument("privacy", env({}), fetcher)).resolves.toBeNull()
    }
  })
})
