import { Inject, Injectable, type OnModuleInit } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { CreditsService } from "./credits.service";

/** Credits every new account once, so a first application needs no payment. */
@Injectable()
export class WelcomeCreditsListener implements OnModuleInit {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(CreditsService) private readonly credits: CreditsService,
  ) {}

  onModuleInit() {
    this.auth.onAccountCreated((email) =>
      this.credits.grantWelcomeCredits(email),
    );
  }
}
