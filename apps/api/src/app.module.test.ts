import { AdminModule } from "./admin/admin.module";
import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { AppController } from "./app.controller";
import { AppModule } from "./app.module";
import { AuthModule } from "./auth/auth.module";
import { SmtpModule } from "./smtp/smtp.module";
import { OpenRouterModule } from "./ai/openrouter.module";
import { ApplicationsModule } from "./applications/applications.module";
import { AtsModule } from "./ats/ats.module";
import { BillingModule } from "./billing/billing.module";
import { CvGenerationModule } from "./cv-generation/cv-generation.module";
import { CreditsModule } from "./credits/credits.module";
import { DatabaseModule } from "./database/database.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { LegalDocumentsModule } from "./legal/legal.module";
import { CreditOffersModule } from "./offers/offers.module";
import { PrivacyModule } from "./privacy/privacy.module";
import { JobSearchModule } from "./job-search/job-search.module";
import { ProfilesModule } from "./profiles/profiles.module";
import { SearchProjectsModule } from "./search-projects/search-projects.module";
import { TemplatesModule } from "./templates/templates.module";
import { InterviewModule } from "./interview/interview.module";
import { MetricsModule } from "./metrics/metrics.module";
import { RateLimitModule } from "./shared/rate-limit/rate-limit.module";

describe("AppModule", () => {
  it("should register all core modules including CvGenerationModule", () => {
    const imports = Reflect.getMetadata("imports", AppModule) as
      | unknown[]
      | undefined;

    expect(imports).toEqual([
      AdminModule,
      AuthModule,
      SmtpModule,
      OpenRouterModule,
      ApplicationsModule,
      AtsModule,
      BillingModule,
      CvGenerationModule,
      CreditsModule,
      DatabaseModule,
      NotificationsModule,
      CreditOffersModule,
      LegalDocumentsModule,
      PrivacyModule,
      ProfilesModule,
      SearchProjectsModule,
      TemplatesModule,
      InterviewModule,
      JobSearchModule,
      MetricsModule,
      RateLimitModule,
    ]);
  });

  it("should register AppController", () => {
    const controllers = Reflect.getMetadata("controllers", AppModule) as
      | unknown[]
      | undefined;

    expect(controllers).toEqual([AppController]);
  });
});
