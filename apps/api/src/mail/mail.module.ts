import { Module } from "@nestjs/common";
import { SMTP_CONFIG, type SmtpConfig } from "../smtp/smtp.config";
import { SmtpModule } from "../smtp/smtp.module";
import { MAIL_CONFIG, resolveMailConfig } from "./mail.config";
import { MAIL_TRANSPORT, createMailTransport } from "./mail-transport";

@Module({
  imports: [SmtpModule],
  providers: [
    {
      provide: MAIL_CONFIG,
      useFactory: () => resolveMailConfig(process.env),
    },
    {
      provide: MAIL_TRANSPORT,
      inject: [SMTP_CONFIG],
      useFactory: (smtpConfig: SmtpConfig) => createMailTransport(smtpConfig),
    },
  ],
  exports: [SmtpModule, MAIL_CONFIG, MAIL_TRANSPORT],
})
export class MailModule {}
