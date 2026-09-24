import { Inject, Injectable, type OnModuleInit } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { SearchProjectLeadService } from "./search-project-lead.service";

/**
 * Writes the search a visitor of the free job market tool asked for, once
 * their magic link is redeemed (US-137). A failure is logged by the auth
 * service and costs the visitor nothing but the pre-fill: they are signed in.
 */
@Injectable()
export class LeadJobSearchListener implements OnModuleInit {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(SearchProjectLeadService)
    private readonly leads: SearchProjectLeadService,
  ) {}

  onModuleInit() {
    this.auth.onLeadIntent(async (email, intent) => {
      if (intent.kind === "job_search") {
        await this.leads.applyJobSearch(email, intent);
      }
    });
  }
}
