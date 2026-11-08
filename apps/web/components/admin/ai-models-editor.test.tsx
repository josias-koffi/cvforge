import type { AiFeatureModelsOverview } from "@cvforge/types"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { AiModelsEditor } from "@/components/admin/ai-models-editor"

vi.mock("@/app/(app)/admin/ai-models/actions", () => ({
  chooseAiModel: vi.fn(),
  resetAiModel: vi.fn(),
}))
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

const OVERVIEW: AiFeatureModelsOverview = {
  anthropicEnabled: true,
  features: [
    { choice: null, defaultModel: "openai/gpt-4.1-mini", feature: "cv_generation" },
    {
      choice: { model: "claude-haiku-5-5", provider: "anthropic" },
      defaultModel: "mistralai/mistral-small",
      feature: "cv_import",
    },
  ],
}

describe("AiModelsEditor", () => {
  it("shows each feature with what runs by default", () => {
    const html = renderToStaticMarkup(<AiModelsEditor overview={OVERVIEW} />)

    expect(html).toContain("Génération de CV")
    expect(html).toContain("openai/gpt-4.1-mini")
    expect(html).toContain("Import de CV")
    expect(html).toContain('aria-label="Modèle pour Import de CV"')
  })

  it("says why Claude cannot be picked without a key", () => {
    const html = renderToStaticMarkup(
      <AiModelsEditor overview={{ ...OVERVIEW, anthropicEnabled: false }} />
    )

    expect(html).toContain("ANTHROPIC_API_KEY")
  })
})
