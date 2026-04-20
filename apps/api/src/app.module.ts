import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AuthModule } from "./auth/auth.module";
import { SmtpModule } from "./smtp/smtp.module";
import { OpenRouterModule } from "./ai/openrouter.module";

@Module({
  imports: [AuthModule, SmtpModule, OpenRouterModule],
  controllers: [AppController],
})
export class AppModule {}
