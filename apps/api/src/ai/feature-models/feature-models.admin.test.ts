import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { routableAiFeatures } from "@cvforge/types";
import { describe, expect, it, vi } from "vitest";
import type { AuthService } from "../../auth/auth.service";
import { FeatureModelsAdminService } from "./feature-models.admin.service";
import { FeatureModelsController } from "./feature-models.controller";
import { parseBalance, parseModelChoice, parseRoutableFeature } from "./feature-models.validation";

const CLAUDE = { model: "claude-haiku-5-5", provider: "anthropic" as const };

function makeService(anthropicApiKey: string | undefined = "key") {
  const store = {
    listAll: vi.fn().mockResolvedValue([]),
    remove: vi.fn().mockResolvedValue(undefined),
    save: vi.fn().mockResolvedValue(undefined),
  };
  const router = { invalidate: vi.fn() };
  const audit = { recordAiModelChange: vi.fn().mockResolvedValue(undefined) };
  const credit = {
    clear: vi.fn().mockResolvedValue(undefined),
    readSummary: vi.fn().mockResolvedValue(null),
    save: vi.fn().mockResolvedValue(undefined),
  };
  const service = new FeatureModelsAdminService(
    store,
    router,
    audit as never,
    {
      anthropicApiKey,
      defaultModel: "default/model",
      featureModels: { cv_generation: "openai/gpt-4.1-mini" },
    },
    credit,
  );

  return { audit, credit, router, service, store };
}

describe("FeatureModelsAdminService", () => {
  it("lists every routable feature with what runs without a choice", async () => {
    const { service, store } = makeService();
    store.listAll.mockResolvedValue([{ feature: "cv_import", ...CLAUDE }]);

    const overview = await service.overview();

    expect(overview.anthropicEnabled).toBe(true);
    expect(overview.features.map((row) => row.feature)).toEqual(routableAiFeatures);
    expect(overview.features.find((row) => row.feature === "cv_generation")).toEqual({
      choice: null,
      defaultModel: "openai/gpt-4.1-mini",
      feature: "cv_generation",
    });
    expect(overview.features.find((row) => row.feature === "cv_import")?.choice).toEqual(CLAUDE);
  });

  it("saves, refreshes the cache and audits a choice", async () => {
    const { audit, router, service, store } = makeService();

    await service.choose("cv_import", CLAUDE, "admin@example.com");

    expect(store.save).toHaveBeenCalledWith("cv_import", CLAUDE);
    expect(router.invalidate).toHaveBeenCalled();
    expect(audit.recordAiModelChange).toHaveBeenCalledWith({
      actorEmail: "admin@example.com",
      feature: "cv_import",
      model: "anthropic:claude-haiku-5-5",
    });
  });

  it("refuses Claude when no key is configured", async () => {
    const { service, store } = makeService("");

    await expect(service.choose("cv_import", CLAUDE, "a@example.com")).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(store.save).not.toHaveBeenCalled();
  });

  it("saves the balance, and removes it on null", async () => {
    const { credit, service } = makeService();

    await service.setAnthropicBalance(180.5);
    expect(credit.save).toHaveBeenCalledWith(180.5);

    await service.setAnthropicBalance(null);
    expect(credit.clear).toHaveBeenCalled();
  });

  it("audits a return to the default", async () => {
    const { audit, router, service, store } = makeService();

    await service.reset("cv_import", "admin@example.com");

    expect(store.remove).toHaveBeenCalledWith("cv_import");
    expect(router.invalidate).toHaveBeenCalled();
    expect(audit.recordAiModelChange).toHaveBeenCalledWith({
      actorEmail: "admin@example.com",
      feature: "cv_import",
      model: null,
    });
  });
});

describe("validation", () => {
  it("accepts a listed Claude model and a well-formed OpenRouter id", () => {
    expect(parseModelChoice(CLAUDE)).toEqual(CLAUDE);
    expect(parseModelChoice({ model: " openai/gpt-4.1-mini ", provider: "openrouter" })).toEqual({
      model: "openai/gpt-4.1-mini",
      provider: "openrouter",
    });
  });

  it.each([
    [{ model: "claude-unknown", provider: "anthropic" }],
    [{ model: "no-slash", provider: "openrouter" }],
    [{ model: "openai/gpt-4.1-mini", provider: "mystery" }],
    [null],
  ])("rejects %j", (body) => {
    expect(() => parseModelChoice(body)).toThrow(BadRequestException);
  });

  it("reads a balance, or null to remove it", () => {
    expect(parseBalance({ balanceUsd: 200 })).toBe(200);
    expect(parseBalance({ balanceUsd: 0 })).toBe(0);
    expect(parseBalance({ balanceUsd: null })).toBeNull();
  });

  it.each([[{ balanceUsd: -1 }], [{ balanceUsd: "200" }], [{}], [{ balanceUsd: 2_000_000 }]])(
    "rejects the balance %j",
    (body) => {
      expect(() => parseBalance(body)).toThrow(BadRequestException);
    },
  );

  it("refuses the voice features, which do not run on this pipeline", () => {
    expect(parseRoutableFeature("cv_import")).toBe("cv_import");
    expect(() => parseRoutableFeature("interview_voice")).toThrow(BadRequestException);
    expect(() => parseRoutableFeature("nope")).toThrow(BadRequestException);
  });
});

describe("FeatureModelsController", () => {
  const request = { headers: { cookie: "cvforge_session=abc" } };

  function makeController(role: "admin" | "user") {
    const models = {
      choose: vi.fn().mockResolvedValue({}),
      overview: vi.fn().mockResolvedValue({}),
      reset: vi.fn().mockResolvedValue({}),
      setAnthropicBalance: vi.fn().mockResolvedValue({}),
    };
    const authService = {
      readSessionFromCookieHeader: vi.fn().mockReturnValue({ email: "a@example.com", role }),
    };

    return {
      controller: new FeatureModelsController(
        models as unknown as FeatureModelsAdminService,
        authService as unknown as AuthService,
      ),
      models,
    };
  }

  it("passes a valid choice on with the admin's email", () => {
    const { controller, models } = makeController("admin");

    controller.choose("cv_import", CLAUDE, request);

    expect(models.choose).toHaveBeenCalledWith("cv_import", CLAUDE, "a@example.com");
  });

  it("forbids non-admin sessions on every route", () => {
    const { controller, models } = makeController("user");

    expect(() => controller.overview(request)).toThrow(ForbiddenException);
    expect(() => controller.choose("cv_import", CLAUDE, request)).toThrow(ForbiddenException);
    expect(() => controller.reset("cv_import", request)).toThrow(ForbiddenException);
    expect(() => controller.setAnthropicBalance({ balanceUsd: 1 }, request)).toThrow(
      ForbiddenException,
    );
    expect(models.choose).not.toHaveBeenCalled();
  });
});
