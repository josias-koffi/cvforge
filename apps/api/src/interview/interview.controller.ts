import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import type { InterviewTranscriptionChunkRequest } from "@cvforge/types";
import { AuthService } from "../auth/auth.service";
import { InterviewService } from "./interview.service";

type RequestLike = {
  headers: { cookie?: string };
};

@Controller("interviews")
export class InterviewController {
  constructor(
    @Inject(InterviewService)
    private readonly interviewService: InterviewService,
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  @Post("sessions")
  startSession(@Req() request: RequestLike) {
    const session = this.readSession(request);
    return this.interviewService.startSession(session.email);
  }

  @Get("sessions/:sessionId")
  getSession(
    @Param("sessionId") sessionId: string,
    @Req() request: RequestLike,
  ) {
    const session = this.readSession(request);
    return this.interviewService.getSession(session.email, sessionId);
  }

  @Post("sessions/:sessionId/chunks")
  transcribeChunk(
    @Param("sessionId") sessionId: string,
    @Body() body: InterviewTranscriptionChunkRequest,
    @Req() request: RequestLike,
  ) {
    const session = this.readSession(request);
    return this.interviewService.transcribeChunk(session.email, sessionId, body);
  }

  private readSession(request: RequestLike) {
    const session = this.authService.readSessionFromCookieHeader(
      request.headers.cookie,
    );

    if (!session) {
      throw new UnauthorizedException("A valid session is required.");
    }

    return session;
  }
}
