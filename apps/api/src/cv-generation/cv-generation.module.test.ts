import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { CvGenerationModule } from "./cv-generation.module";
import { CvGenerationController } from "./cv-generation.controller";
import { AuthModule } from "../auth/auth.module";
import { CreditsModule } from "../credits/credits.module";
import { OpenRouterModule } from "../ai/openrouter.module";

describe("CvGenerationModule", () => {
  it("registers CvGenerationController", () => {
    const controllers = Reflect.getMetadata("controllers", CvGenerationModule) as unknown[] | undefined;
    expect(controllers).toContain(CvGenerationController);
  });

  it("imports AuthModule, CreditsModule, and OpenRouterModule", () => {
    const imports = Reflect.getMetadata("imports", CvGenerationModule) as unknown[] | undefined;
    expect(imports).toContain(AuthModule);
    expect(imports).toContain(CreditsModule);
    expect(imports).toContain(OpenRouterModule);
  });
});
