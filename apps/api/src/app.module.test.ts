import { AcquisitionModule } from "./acquisition/acquisition.module";
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
import { CompanyCheckModule } from "./company-check/company-check.module";
import { JobMarketModule } from "./job-market/job-market.module";
import { KeywordMatchModule } from "./keyword-match/keyword-match.module";
import { BillingModule } from "./billing/billing.module";
import { CvGenerationModule } from "./cv-generation/cv-generation.module";
import { CreditsModule } from "./credits/credits.module";
import { DatabaseModule } from "./database/database.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { LegalDocumentsModule } from "./legal/legal.module";
import { CreditOffersModule } from "./offers/offers.module";
import { PrivacyModule } from "./privacy/privacy.module";
import { JobSearchModule } from "./job-search/job-search.module";
import { HiringCompaniesModule } from "./hiring-companies/hiring-companies.module";
import { CompanyLogosModule } from "./company-logos/company-logos.module";
import { MarketModule } from "./market/market.module";
import { RomeModule } from "./rome/rome.module";
import { ProfilesModule } from "./profiles/profiles.module";
import { SearchProjectsModule } from "./search-projects/search-projects.module";
import { TemplatesModule } from "./templates/templates.module";
import { InterviewModule } from "./interview/interview.module";
import { InterviewQuestionsModule } from "./interview-questions/interview-questions.module";
import { MetricsModule } from "./metrics/metrics.module";
import { RateLimitModule } from "./shared/rate-limit/rate-limit.module";
import { RedisModule } from "./shared/redis/redis.module";

describe("AppModule", () => {
  it("should register all core modules including CvGenerationModule", () => {
    const imports = Reflect.getMetadata("imports", AppModule) as
      | unknown[]
      | undefined;

    expect(imports).toEqual([
      AcquisitionModule,
      AdminModule,
      AuthModule,
      SmtpModule,
      OpenRouterModule,
      ApplicationsModule,
      AtsModule,
      KeywordMatchModule,
      JobMarketModule,
      CompanyCheckModule,
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
      InterviewQuestionsModule,
      JobSearchModule,
      MarketModule,
      HiringCompaniesModule,
      CompanyLogosModule,
      RomeModule,
      MetricsModule,
      RateLimitModule,
      RedisModule,
    ]);
  });

  it("should register AppController", () => {
    const controllers = Reflect.getMetadata("controllers", AppModule) as
      | unknown[]
      | undefined;

    expect(controllers).toEqual([AppController]);
  });
});
