import type { Provider } from "@nestjs/common";
import { ApplicationsService } from "../../applications/applications.service";
import { SubmissionsService } from "../../applications/submissions.service";
import { FormFillService } from "../form-fill/form-fill.service";
import { FormMapsService } from "../form-maps/form-maps.service";
import { formMapTools } from "./tools/form-map-tools";
import { CreditsService } from "../../credits/credits.service";
import { CvGenerationService } from "../../cv-generation/cv-generation.service";
import { JobMatchesService } from "../../job-search/job-matches.service";
import { NotificationsService } from "../../notifications/notifications.service";
import { ProfilesService } from "../../profiles/profiles.service";
import { ScreeningAnswersService } from "../../profiles/screening-answers.service";
import type { McpToolDefinition } from "./mcp-tool";
import { SignedFiles } from "./signed-files";
import { applicationTools } from "./tools/application-tools";
import { profileWriteTools } from "./tools/profile-write-tools";
import { readTools } from "./tools/read-tools";
import { formFillTools } from "./tools/form-fill-tools";
import { screeningTools } from "./tools/screening-tools";
import { submissionTools } from "./tools/submission-tools";

/** DI token for the full list of MCP tools; each request keeps those its token allows. */
export const MCP_TOOLS = Symbol("MCP_TOOLS");

export type McpToolList = McpToolDefinition[];

export const mcpToolsProvider: Provider = {
  inject: [
    ApplicationsService,
    CreditsService,
    CvGenerationService,
    JobMatchesService,
    NotificationsService,
    ProfilesService,
    ScreeningAnswersService,
    SignedFiles,
    SubmissionsService,
    FormFillService,
    FormMapsService,
  ],
  provide: MCP_TOOLS,
  useFactory: (
    applications: ApplicationsService,
    credits: CreditsService,
    documents: CvGenerationService,
    jobs: JobMatchesService,
    notifications: NotificationsService,
    profiles: ProfilesService,
    answers: ScreeningAnswersService,
    signedFiles: SignedFiles,
    submissions: SubmissionsService,
    fills: FormFillService,
    maps: FormMapsService,
  ): McpToolList => [
    ...readTools({
      applications,
      credits,
      documents,
      jobs,
      notifications,
      profiles,
    }),
    ...profileWriteTools({ profiles }),
    ...screeningTools({ answers, profiles }),
    ...submissionTools({ submissions }),
    ...formFillTools({ fills }),
    ...formMapTools({ maps }),
    ...applicationTools({
      applications,
      credits,
      documents,
      jobs,
      profiles,
      signedFiles,
    }),
  ],
};
