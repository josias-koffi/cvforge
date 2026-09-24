import { Module, type MiddlewareConsumer, type NestModule } from "@nestjs/common";
import { AcquisitionModule } from "./acquisition/acquisition.module";
import { AdminModule } from "./admin/admin.module";
import { AppController } from "./app.controller";
import { AuthModule } from "./auth/auth.module";
import { SessionStateMiddleware } from "./auth/session-state.middleware";
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
import { RateLimitMiddleware } from "./shared/rate-limit/rate-limit.middleware";
import { rateLimitedRoutes } from "./shared/rate-limit/rate-limit.policies";

@Module({
  imports: [
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
  ],
  controllers: [AppController],
})
export class AppModule implements NestModule {
  /**
   * Suspension and session revocation are enforced here, once per request,
   * rather than in each handler's `requireSession` — see
   * `SessionStateMiddleware`. Excluding the auth routes keeps a suspended user
   * able to read the refusal and log out.
   */
  configure(consumer: MiddlewareConsumer) {
    // Express 5 (NestJS 11) matches paths with path-to-regexp v8: a bare "*"
    // is not a valid path and throws at bootstrap. Wildcards must be named,
    // and braced to also match the base path.
    consumer
      .apply(SessionStateMiddleware)
      .exclude("auth/{*splat}", "health", "ready", "billing/stripe/webhook")
      .forRoutes("{*splat}");

    // Only the public routes that write or spend: each one is declared with
    // its limits in `rate-limit.policies.ts`, and the cheap public reads
    // (`public/legal`, `public/credit-offers`) stay unmetered (ADR-022).
    consumer.apply(RateLimitMiddleware).forRoutes(...rateLimitedRoutes());
  }
}
