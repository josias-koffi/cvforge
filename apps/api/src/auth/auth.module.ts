import { Module } from "@nestjs/common";
import { PgAuthAccountStore } from "./auth.pg-store";
import { MailModule } from "../mail/mail.module";
import { DATABASE, type Database } from "../database/database.types";
import { AuthMailerService } from "./auth-mailer.service";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { resolveAuthConfig } from "./auth.config";
import { SessionStateMiddleware } from "./session-state.middleware";
import { AUTH_ACCOUNT_STORE, type AuthAccountStore } from "./auth.types";

@Module({
  imports: [MailModule],
  controllers: [AuthController],
  providers: [
    {
      provide: AUTH_ACCOUNT_STORE,
      inject: [DATABASE],
      useFactory: (db: Database) => new PgAuthAccountStore(db),
    },
    {
      provide: AuthService,
      inject: [AUTH_ACCOUNT_STORE],
      useFactory: (store: AuthAccountStore) =>
        new AuthService(resolveAuthConfig(process.env), store),
    },
    {
      provide: SessionStateMiddleware,
      inject: [AuthService],
      useFactory: (authService: AuthService) =>
        new SessionStateMiddleware(authService),
    },
    AuthMailerService,
  ],
  exports: [AUTH_ACCOUNT_STORE, AuthService, AuthMailerService, SessionStateMiddleware],
})
export class AuthModule {}
