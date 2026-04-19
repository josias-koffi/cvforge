import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AuthModule } from "./auth/auth.module";
import { SmtpModule } from "./smtp/smtp.module";

@Module({
  imports: [AuthModule, SmtpModule],
  controllers: [AppController],
})
export class AppModule {}
