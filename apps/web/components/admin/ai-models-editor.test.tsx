import type { AiFeatureModelsOverview } from "@cvforge/types"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { AiModelsEditor } from "@/components/admin/ai-models-editor"

vi.mock("@/app/(app)/admin/ai-models/actions", () => ({
  chooseAiModel: vi.fn(),
  saveAnthropicBalance: vi.fn(),
  resetAiModel: vi.fn(),
}))
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

const OVERVIEW: AiFeatureModelsOverview = {
  anthropicCredit: null,
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

  it("offers a labelled field for the Claude balance", () => {
    const html = renderToStaticMarkup(<AiModelsEditor overview={OVERVIEW} />)

    expect(html).toContain("Solde Claude actuel")
    expect(html).toContain('for="anthropic-balance"')
    expect(html).not.toContain("Retirer")
  })

  it("shows the estimate once a balance is entered", () => {
    const html = renderToStaticMarkup(
      <AiModelsEditor
        overview={{
          ...OVERVIEW,
          anthropicCredit: {
            recordedAt: "2026-11-08T10:00:00.000Z",
            recordedUsd: 200,
            remainingUsd: 195.5,
            spentUsd: 4.5,
          },
        }}
      />
    )

    expect(html).toContain("195,50")
    expect(html).toContain("Retirer")
  })

  it("says why Claude cannot be picked without a key", () => {
    const html = renderToStaticMarkup(
      <AiModelsEditor overview={{ ...OVERVIEW, anthropicEnabled: false }} />
    )

    expect(html).toContain("ANTHROPIC_API_KEY")
  })
})
