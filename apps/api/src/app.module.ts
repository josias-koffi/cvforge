import { Module, type MiddlewareConsumer, type NestModule } from "@nestjs/common";
import { AdminModule } from "./admin/admin.module";
import { AppController } from "./app.controller";
import { AuthModule } from "./auth/auth.module";
import { SessionStateMiddleware } from "./auth/session-state.middleware";
import { SmtpModule } from "./smtp/smtp.module";
import { OpenRouterModule } from "./ai/openrouter.module";
import { ApplicationsModule } from "./applications/applications.module";
import { BillingModule } from "./billing/billing.module";
import { CvGenerationModule } from "./cv-generation/cv-generation.module";
import { CreditsModule } from "./credits/credits.module";
import { DatabaseModule } from "./database/database.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { CreditOffersModule } from "./offers/offers.module";
import { PrivacyModule } from "./privacy/privacy.module";
import { ProfilesModule } from "./profiles/profiles.module";
import { TemplatesModule } from "./templates/templates.module";
import { InterviewModule } from "./interview/interview.module";
import { MetricsModule } from "./metrics/metrics.module";

@Module({
  imports: [
    AdminModule,
    AuthModule,
    SmtpModule,
    OpenRouterModule,
    ApplicationsModule,
    BillingModule,
    CvGenerationModule,
    CreditsModule,
    DatabaseModule,
    NotificationsModule,
    CreditOffersModule,
    PrivacyModule,
    ProfilesModule,
    TemplatesModule,
    InterviewModule,
    MetricsModule,
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
    consumer
      .apply(SessionStateMiddleware)
      .exclude("auth/(.*)", "health", "ready", "billing/stripe/webhook")
      .forRoutes("*");
  }
}
