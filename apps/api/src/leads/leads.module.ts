import { Module } from "@nestjs/common";
import { AuthMailerService } from "../auth/auth-mailer.service";
import { AuthModule } from "../auth/auth.module";
import { AuthService } from "../auth/auth.service";
import { LeadCaptureService } from "./lead-capture.service";

/** The conversion step shared by every free tool of the landing (US-133). */
@Module({
  imports: [AuthModule],
  providers: [
    {
      provide: LeadCaptureService,
      inject: [AuthService, AuthMailerService],
      useFactory: (authService: AuthService, authMailer: AuthMailerService) =>
        new LeadCaptureService(authService, authMailer),
    },
  ],
  exports: [LeadCaptureService],
})
export class LeadsModule {}
