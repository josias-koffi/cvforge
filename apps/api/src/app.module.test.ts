import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { AppController } from "./app.controller";
import { AppModule } from "./app.module";
import { AuthModule } from "./auth/auth.module";
import { SmtpModule } from "./smtp/smtp.module";
import { OpenRouterModule } from "./ai/openrouter.module";
import { ApplicationsModule } from "./applications/applications.module";
import { TemplatesModule } from "./templates/templates.module";

describe("AppModule", () => {
  it("should register AuthModule, SmtpModule, OpenRouterModule, ApplicationsModule and TemplatesModule", () => {
    const imports = Reflect.getMetadata("imports", AppModule) as
      | unknown[]
      | undefined;

    expect(imports).toEqual([
      AuthModule,
      SmtpModule,
      OpenRouterModule,
      ApplicationsModule,
      TemplatesModule,
    ]);
  });

  it("should register AppController", () => {
    const controllers = Reflect.getMetadata("controllers", AppModule) as
      | unknown[]
      | undefined;

    expect(controllers).toEqual([AppController]);
  });
});
