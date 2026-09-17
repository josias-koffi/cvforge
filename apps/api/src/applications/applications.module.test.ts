import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { OpenRouterModule } from "../ai/openrouter.module";
import { AuthModule } from "../auth/auth.module";
import { CreditsModule } from "../credits/credits.module";
import { ProfilesModule } from "../profiles/profiles.module";
import { ApplicationsController } from "./applications.controller";
import { ApplicationsModule } from "./applications.module";
import { ApplicationsService } from "./applications.service";
import { APPLICATIONS_STORE } from "./applications.types";

describe("ApplicationsModule", () => {
  it("registers the auth, credits, openrouter and profiles dependencies", () => {
    const imports = Reflect.getMetadata("imports", ApplicationsModule) as
      | unknown[]
      | undefined;

    expect(imports).toEqual([AuthModule, CreditsModule, OpenRouterModule, ProfilesModule]);
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
    expect(providers?.[0]?.provide).toBe(APPLICATIONS_STORE);
    expect(providers?.[1]?.provide).toBe(ApplicationsService);
  });
});
