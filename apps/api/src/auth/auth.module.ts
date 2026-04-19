import { Module } from "@nestjs/common";
import nodemailer from "nodemailer";
import { SMTP_CONFIG, type SmtpConfig } from "../smtp/smtp.config";
import { SmtpModule } from "../smtp/smtp.module";
import {
  AUTH_EMAIL_FROM,
  AUTH_MAIL_TRANSPORT,
  AuthMailerService,
} from "./auth-mailer.service";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { resolveAuthConfig } from "./auth.config";

function readEmailFrom(env: NodeJS.ProcessEnv) {
  const value = env.EMAIL_FROM?.trim();

  return value && value.length > 0 ? value : null;
}

@Module({
  imports: [SmtpModule],
  controllers: [AuthController],
  providers: [
    {
      provide: AuthService,
      useFactory: () => new AuthService(resolveAuthConfig(process.env)),
    },
    {
      provide: AUTH_EMAIL_FROM,
      useFactory: () => readEmailFrom(process.env),
    },
    {
      provide: AUTH_MAIL_TRANSPORT,
      inject: [SMTP_CONFIG],
      useFactory: (smtpConfig: SmtpConfig) => {
        if (!smtpConfig.enabled) {
          return null;
        }

        return nodemailer.createTransport({
          auth: {
            pass: smtpConfig.password ?? undefined,
            user: smtpConfig.user ?? undefined,
          },
          host: smtpConfig.server ?? undefined,
          port: smtpConfig.port ?? undefined,
          secure: smtpConfig.port === 465,
        });
      },
    },
    AuthMailerService,
  ],
  exports: [AuthService, AuthMailerService],
})
export class AuthModule {}
