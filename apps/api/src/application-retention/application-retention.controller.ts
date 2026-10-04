import { Controller, Inject, Param, Post, Req } from "@nestjs/common";
import { ApplicationsService } from "../applications/applications.service";
import {
  APPLICATIONS_STORE,
  type ApplicationsStore,
} from "../applications/applications.types";
import { AuthService } from "../auth/auth.service";
import { requireSession, type CookieRequest } from "../auth/request-session";

/** "Garder" on an application about to be deleted (US-170). */
@Controller("applications")
export class ApplicationRetentionController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(ApplicationsService)
    private readonly applications: ApplicationsService,
    @Inject(APPLICATIONS_STORE) private readonly store: ApplicationsStore,
  ) {}

  /**
   * Keeping is a change like any other: the year starts again from now, and
   * the warning no longer applies.
   */
  @Post(":applicationId/keep")
  async keep(
    @Param("applicationId") applicationId: string,
    @Req() request: CookieRequest,
  ) {
    const session = requireSession(this.authService, request);
    const application = await this.applications.getOwnedApplication(
      session.email,
      applicationId,
    );

    await this.store.save({
      ...application,
      updatedAt: new Date().toISOString(),
    });

    return {
      application: await this.applications.getApplicationForUser(
        session.email,
        applicationId,
      ),
    };
  }
}
