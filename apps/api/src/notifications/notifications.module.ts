import { Module } from "@nestjs/common";
import nodemailer from "nodemailer";
import { AuthModule } from "../auth/auth.module";
import { SMTP_CONFIG, type SmtpConfig } from "../smtp/smtp.config";
import { SmtpModule } from "../smtp/smtp.module";
import { resolveApplicationsConfig } from "../applications/applications.config";
import { FileApplicationsStore } from "../applications/applications.store";
import { resolveNotificationsConfig } from "./notifications.config";
import { NotificationsController } from "./notifications.controller";
import {
  NOTIFICATIONS_EMAIL_FROM,
  NOTIFICATIONS_MAIL_TRANSPORT,
  NotificationsMailerService,
} from "./notifications-mailer.service";
import { NotificationsService } from "./notifications.service";
import { FileNotificationsStore } from "./notifications.store";

function readEmailFrom(env: NodeJS.ProcessEnv) {
  const value = env.EMAIL_FROM?.trim();

  return value && value.length > 0 ? value : null;
}

@Module({
  imports: [AuthModule, SmtpModule],
  controllers: [NotificationsController],
  providers: [
    {
      provide: NOTIFICATIONS_EMAIL_FROM,
      useFactory: () => readEmailFrom(process.env),
    },
    {
      provide: NOTIFICATIONS_MAIL_TRANSPORT,
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
    NotificationsMailerService,
    {
      provide: NotificationsService,
      inject: [NotificationsMailerService],
      useFactory: (notificationsMailer: NotificationsMailerService) => {
        const config = resolveNotificationsConfig(process.env);

        return new NotificationsService(
          new FileNotificationsStore(config.stateFilePath),
          new FileApplicationsStore(
            resolveApplicationsConfig(process.env).stateFilePath,
          ),
          config,
          notificationsMailer,
        );
      },
    },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
