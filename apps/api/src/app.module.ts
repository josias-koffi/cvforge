import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AuthModule } from "./auth/auth.module";
import { SmtpModule } from "./smtp/smtp.module";
import { OpenRouterModule } from "./ai/openrouter.module";
import { ApplicationsModule } from "./applications/applications.module";
import { BillingModule } from "./billing/billing.module";
import { CvGenerationModule } from "./cv-generation/cv-generation.module";
import { CreditsModule } from "./credits/credits.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { TemplatesModule } from "./templates/templates.module";

@Module({
  imports: [
    AuthModule,
    SmtpModule,
    OpenRouterModule,
    ApplicationsModule,
    BillingModule,
    CvGenerationModule,
    CreditsModule,
    NotificationsModule,
    TemplatesModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
