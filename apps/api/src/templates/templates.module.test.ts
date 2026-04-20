import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { AuthModule } from "../auth/auth.module";
import { TemplatesController } from "./templates.controller";
import { TemplatesModule } from "./templates.module";
import { TemplatesService } from "./templates.service";

describe("TemplatesModule", () => {
  it("registers the auth dependency and templates providers", () => {
    const imports = Reflect.getMetadata("imports", TemplatesModule) as
      | unknown[]
      | undefined;
    const controllers = Reflect.getMetadata(
      "controllers",
      TemplatesModule,
    ) as unknown[] | undefined;
    const providers = Reflect.getMetadata(
      "providers",
      TemplatesModule,
    ) as Array<{ provide?: unknown }> | undefined;

    expect(imports).toEqual([AuthModule]);
    expect(controllers).toEqual([TemplatesController]);
    expect(providers?.[0]?.provide).toBe(TemplatesService);
  });
});
