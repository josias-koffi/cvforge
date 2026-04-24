import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { AppController } from "./app.controller";
import { AppModule } from "./app.module";
import { AuthModule } from "./auth/auth.module";
import { SmtpModule } from "./smtp/smtp.module";
import { OpenRouterModule } from "./ai/openrouter.module";
import { ApplicationsModule } from "./applications/applications.module";
import { BillingModule } from "./billing/billing.module";
import { CvGenerationModule } from "./cv-generation/cv-generation.module";
import { CreditsModule } from "./credits/credits.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { PrivacyModule } from "./privacy/privacy.module";
import { TemplatesModule } from "./templates/templates.module";
import { InterviewModule } from "./interview/interview.module";

describe("AppModule", () => {
  it("should register all core modules including CvGenerationModule", () => {
    const imports = Reflect.getMetadata("imports", AppModule) as
      | unknown[]
      | undefined;

    expect(imports).toEqual([
      AuthModule,
      SmtpModule,
      OpenRouterModule,
      ApplicationsModule,
      BillingModule,
      CvGenerationModule,
      CreditsModule,
      NotificationsModule,
      PrivacyModule,
      TemplatesModule,
      InterviewModule,
    ]);
  });

  it("should register AppController", () => {
    const controllers = Reflect.getMetadata("controllers", AppModule) as
      | unknown[]
      | undefined;

    expect(controllers).toEqual([AppController]);
  });
});
