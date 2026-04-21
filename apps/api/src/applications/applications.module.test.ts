import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { OpenRouterModule } from "../ai/openrouter.module";
import { AuthModule } from "../auth/auth.module";
import { CreditsModule } from "../credits/credits.module";
import { ApplicationsController } from "./applications.controller";
import { ApplicationsModule } from "./applications.module";
import { ApplicationsService } from "./applications.service";

describe("ApplicationsModule", () => {
  it("registers the auth and openrouter dependencies", () => {
    const imports = Reflect.getMetadata("imports", ApplicationsModule) as
      | unknown[]
      | undefined;

    expect(imports).toEqual([AuthModule, CreditsModule, OpenRouterModule]);
  });

  it("registers the applications controller and service provider", () => {
    const controllers = Reflect.getMetadata(
      "controllers",
      ApplicationsModule,
    ) as unknown[] | undefined;
    const providers = Reflect.getMetadata(
      "providers",
      ApplicationsModule,
    ) as Array<{ provide?: unknown }> | undefined;

    expect(controllers).toEqual([ApplicationsController]);
    expect(providers?.[0]?.provide).toBe(ApplicationsService);
  });
});
