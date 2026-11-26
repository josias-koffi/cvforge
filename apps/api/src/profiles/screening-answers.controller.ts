import { Body, Controller, Get, Inject, Put, Req } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { requireSession, type CookieRequest } from "../auth/request-session";
import { ScreeningAnswersService } from "./screening-answers.service";

/** The profile screen's "Réponses aux questions des recruteurs" (US-197). */
@Controller("screening-answers")
export class ScreeningAnswersController {
  constructor(
    @Inject(ScreeningAnswersService)
    private readonly answers: ScreeningAnswersService,
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  @Get()
  async get(@Req() request: CookieRequest) {
    const session = requireSession(this.authService, request);

    return { answers: await this.answers.get(session.email) };
  }

  @Put()
  async replace(@Body() body: unknown, @Req() request: CookieRequest) {
    const session = requireSession(this.authService, request);

    return { answers: await this.answers.replace(session.email, body) };
  }
}
