import { Module } from "@nestjs/common";
import { SMTP_CONFIG, createSmtpConfig } from "./smtp.config";

@Module({
  providers: [
    {
      provide: SMTP_CONFIG,
      useFactory: createSmtpConfig,
    },
  ],
  exports: [SMTP_CONFIG],
})
export class SmtpModule {}
