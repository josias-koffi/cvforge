import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { SmtpModule } from "./smtp/smtp.module";

@Module({
  imports: [SmtpModule],
  controllers: [AppController],
})
export class AppModule {}
