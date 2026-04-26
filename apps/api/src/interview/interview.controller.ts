import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
  Sse,
  UnauthorizedException,
} from "@nestjs/common";
import type {
  InterviewRecruiterProfile,
  InterviewSessionStartRequest,
  InterviewTranscriptionChunkRequest,
} from "@cvforge/types";
import { Observable } from "rxjs";
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
  startSession(
    @Body() body: InterviewSessionStartRequest | undefined,
    @Req() request: RequestLike,
  ) {
    const session = this.readSession(request);
    return this.interviewService.startSession(
      session.email,
      body?.language === "en" ? "en" : "fr",
      this.readProfile(body?.profile),
      typeof body?.applicationId === "string" ? body.applicationId.trim() : "",
    );
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

  @Post("sessions/:sessionId/finish")
  async finishSession(
    @Param("sessionId") sessionId: string,
    @Req() request: RequestLike,
  ) {
    const session = this.readSession(request);
    return this.interviewService.finishSession(session.email, sessionId);
  }

  @Sse("sessions/:sessionId/respond")
  streamAIResponse(
    @Param("sessionId") sessionId: string,
    @Req() request: RequestLike,
  ): Observable<MessageEvent> {
    const session = this.readSession(request);
    const generator = this.interviewService.streamAIResponse(
      session.email,
      sessionId,
    );

    return new Observable<MessageEvent>((subscriber) => {
      (async () => {
        try {
          for await (const event of generator) {
            subscriber.next({ data: JSON.stringify(event) } as MessageEvent);
          }
          subscriber.complete();
        } catch (error) {
          subscriber.error(error);
        }
      })();
    });
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

  private readProfile(value: string | undefined): InterviewRecruiterProfile {
    switch (value) {
      case "aggressive":
      case "passive":
      case "technical":
      case "behavioral":
      case "standard":
        return value;
      default:
        return "standard";
    }
  }
}
