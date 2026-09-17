import { Module } from "@nestjs/common";
import nodemailer from "nodemailer";
import { AuthModule } from "../auth/auth.module";
import { SMTP_CONFIG, type SmtpConfig } from "../smtp/smtp.config";
import { SmtpModule } from "../smtp/smtp.module";
import { ApplicationsModule } from "../applications/applications.module";
import {
  APPLICATIONS_STORE,
  type ApplicationsStore,
} from "../applications/applications.types";
import { resolveNotificationsConfig } from "./notifications.config";
import { NotificationsController } from "./notifications.controller";
import {
  NOTIFICATIONS_EMAIL_FROM,
  NOTIFICATIONS_MAIL_TRANSPORT,
  NotificationsMailerService,
} from "./notifications-mailer.service";
import { NotificationsService } from "./notifications.service";
import { FileNotificationsStore } from "./notifications.store";
import {
  NOTIFICATIONS_STORE,
  type NotificationsStore,
} from "./notifications.types";

function readEmailFrom(env: NodeJS.ProcessEnv) {
  const value = env.EMAIL_FROM?.trim();

  return value && value.length > 0 ? value : null;
}

@Module({
  imports: [AuthModule, ApplicationsModule, SmtpModule],
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
      provide: NOTIFICATIONS_STORE,
      useFactory: () =>
        new FileNotificationsStore(
          resolveNotificationsConfig(process.env).stateFilePath,
        ),
    },
    {
      provide: NotificationsService,
      inject: [NOTIFICATIONS_STORE, APPLICATIONS_STORE, NotificationsMailerService],
      useFactory: (
        store: NotificationsStore,
        applicationsStore: ApplicationsStore,
        notificationsMailer: NotificationsMailerService,
      ) =>
        new NotificationsService(
          store,
          applicationsStore,
          resolveNotificationsConfig(process.env),
          notificationsMailer,
        ),
    },
  ],
  exports: [NOTIFICATIONS_STORE, NotificationsService],
})
export class NotificationsModule {}
