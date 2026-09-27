import { Inject, Injectable, type OnModuleInit } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { ApplicationsService } from "./applications.service";
import {
  LEAD_INTERVIEW_SOURCE_LABEL,
  LEAD_OFFER_SOURCE_LABEL,
} from "./applications.types";

/**
 * Opens the application a visitor of the free CV ↔ offer comparator (US-136)
 * or of the likely interview questions (US-141) asked for, once their magic
 * link is redeemed. The link is single-use, so one link makes one
 * application; the label says which tool it came from.
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
      if (intent.kind === "offer" || intent.kind === "interview") {
        await this.applications.importOfferedText(
          email,
          intent.offerText,
          intent.kind === "offer"
            ? LEAD_OFFER_SOURCE_LABEL
            : LEAD_INTERVIEW_SOURCE_LABEL,
        );
      }
    });
  }
}
