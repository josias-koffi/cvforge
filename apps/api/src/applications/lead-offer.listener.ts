import { Inject, Injectable, type OnModuleInit } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { ApplicationsService } from "./applications.service";

/**
 * Opens the application a visitor of the free CV ↔ offer comparator asked
 * for, once their magic link is redeemed (US-136). The link is single-use, so
 * one link makes one application.
 */
@Injectable()
export class LeadOfferListener implements OnModuleInit {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(ApplicationsService)
    private readonly applications: ApplicationsService,
  ) {}

  onModuleInit() {
    this.auth.onLeadIntent(async (email, intent) => {
      if (intent.kind === "offer") {
        await this.applications.importOfferedText(email, intent.offerText);
      }
    });
  }
}
