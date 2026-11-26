import {
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Req,
  Res,
  StreamableFile,
} from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { requireSession, type CookieRequest } from "../auth/request-session";
import { SubmissionsService } from "./submissions.service";

type ResponseLike = { setHeader(name: string, value: string): void };

/** The proof of what the extension sent, on the application page (US-198). */
@Controller("applications")
export class SubmissionsController {
  constructor(
    @Inject(SubmissionsService)
    private readonly submissions: SubmissionsService,
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  @Get(":applicationId/submissions")
  async list(
    @Param("applicationId") applicationId: string,
    @Req() request: CookieRequest,
  ) {
    const session = requireSession(this.authService, request);

    return {
      submissions: await this.submissions.list(session.email, applicationId),
    };
  }

  @Get("submissions/:submissionId/screenshot")
  async screenshot(
    @Param("submissionId", new ParseUUIDPipe()) submissionId: string,
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: ResponseLike,
  ) {
    const session = requireSession(this.authService, request);
    const shot = await this.submissions.screenshot(session.email, submissionId);

    response.setHeader("Cache-Control", "private, max-age=86400");
    response.setHeader("X-Content-Type-Options", "nosniff");
    return new StreamableFile(shot.bytes, { type: shot.type });
  }
}
