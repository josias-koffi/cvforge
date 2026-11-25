import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { requireSession, type CookieRequest } from "../auth/request-session";
import { readAgentTokenCreateRequest } from "./agent-token-input";
import { AgentTokensService } from "./agent-tokens.service";

/**
 * Token management for `/compte/agents`. Cookie session only: an agent token
 * never reaches these routes (`SessionGuard` does not read `Authorization`),
 * so an agent cannot mint or revoke tokens.
 */
@Controller("agent-tokens")
export class AgentTokensController {
  constructor(
    @Inject(AgentTokensService) private readonly tokens: AgentTokensService,
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  @Get()
  async list(@Req() request: CookieRequest) {
    const session = requireSession(this.authService, request);

    return { tokens: await this.tokens.list(session.email) };
  }

  @Post()
  create(@Body() body: unknown, @Req() request: CookieRequest) {
    const session = requireSession(this.authService, request);
    const input = readAgentTokenCreateRequest(body);

    if (typeof input === "string") {
      throw new BadRequestException(input);
    }

    return this.tokens.create(session.email, input);
  }

  @Get("activity")
  async activity(@Req() request: CookieRequest) {
    const session = requireSession(this.authService, request);

    return { calls: await this.tokens.listActivity(session.email) };
  }

  @Delete(":id")
  @HttpCode(204)
  async revoke(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() request: CookieRequest,
  ) {
    const session = requireSession(this.authService, request);

    await this.tokens.revoke(session.email, id);
  }
}
