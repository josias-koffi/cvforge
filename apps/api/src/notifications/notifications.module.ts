import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { MailModule } from "../mail/mail.module";
import { ApplicationsModule } from "../applications/applications.module";
import { DATABASE, type Database } from "../database/database.types";
import {
  APPLICATIONS_STORE,
  type ApplicationsStore,
} from "../applications/applications.types";
import { resolveNotificationsConfig } from "./notifications.config";
import { NotificationsController } from "./notifications.controller";
import { NotificationsMailerService } from "./notifications-mailer.service";
import { NotificationsService } from "./notifications.service";
import { PgNotificationsStore } from "./notifications.pg-store";
import {
  NOTIFICATIONS_STORE,
  type NotificationsStore,
} from "./notifications.types";

@Module({
  imports: [AuthModule, ApplicationsModule, MailModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsMailerService,
    {
      provide: NOTIFICATIONS_STORE,
      inject: [DATABASE],
      useFactory: (db: Database) => new PgNotificationsStore(db),
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
