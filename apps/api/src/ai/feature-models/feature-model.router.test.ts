import { describe, expect, it, vi } from "vitest";
import { FEATURE_MODELS_CACHE_TTL_MS, FeatureModelRouter } from "./feature-model.router";
import type { FeatureModelRow } from "./feature-models.pg-store";

const CLAUDE: FeatureModelRow = {
  feature: "cv_generation",
  model: "claude-haiku-5-5",
  provider: "anthropic",
};

function makeRouter(listAll: () => Promise<FeatureModelRow[]>) {
  let now = 1_000;
  const router = new FeatureModelRouter({ listAll }, () => now);

  return { advance: (ms: number) => (now += ms), router };
}

describe("FeatureModelRouter", () => {
  it("returns the chosen target, and null for a feature nobody chose", async () => {
    const { router } = makeRouter(async () => [CLAUDE]);

    await expect(router.targetFor("cv_generation")).resolves.toEqual({
      model: "claude-haiku-5-5",
      provider: "anthropic",
    });
    await expect(router.targetFor("cv_import")).resolves.toBeNull();
  });

  it("reads the table once per minute, not once per AI call", async () => {
    const listAll = vi.fn().mockResolvedValue([CLAUDE]);
    const { advance, router } = makeRouter(listAll);

    await router.targetFor("cv_generation");
    await router.targetFor("cv_import");
    expect(listAll).toHaveBeenCalledTimes(1);

    advance(FEATURE_MODELS_CACHE_TTL_MS + 1);
    await router.targetFor("cv_generation");
    expect(listAll).toHaveBeenCalledTimes(2);
  });

  it("applies a change at once on the instance that saved it", async () => {
    const listAll = vi.fn().mockResolvedValueOnce([CLAUDE]).mockResolvedValueOnce([]);
    const { router } = makeRouter(listAll);

    await router.targetFor("cv_generation");
    router.invalidate();

    await expect(router.targetFor("cv_generation")).resolves.toBeNull();
  });

  it("keeps serving the last choices when the database fails", async () => {
    const listAll = vi
      .fn()
      .mockResolvedValueOnce([CLAUDE])
      .mockRejectedValueOnce(new Error("db down"));
    const { advance, router } = makeRouter(listAll);

    await router.targetFor("cv_generation");
    advance(FEATURE_MODELS_CACHE_TTL_MS + 1);

    await expect(router.targetFor("cv_generation")).resolves.toMatchObject({
      provider: "anthropic",
    });
  });

  it("falls back to the deployment's chain when nothing was ever read", async () => {
    const { router } = makeRouter(() => Promise.reject(new Error("db down")));

    await expect(router.targetFor("cv_generation")).resolves.toBeNull();
  });
});
