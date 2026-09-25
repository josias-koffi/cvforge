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
import {
  INTERVIEW_DEFAULT_DURATION_MINUTES,
  isInterviewDuration,
  type InterviewRealtimeCallRequest,
  type InterviewRecruiterProfile,
  type InterviewSessionStartRequest,
} from "@cvforge/types";
import { AuthService } from "../auth/auth.service";
import { InterviewProgressService } from "./interview-progress.service";
import { InterviewRealtimeService } from "./interview-realtime.service";
import { InterviewService } from "./interview.service";

type RequestLike = {
  headers: { cookie?: string };
};

@Controller("interviews")
export class InterviewController {
  constructor(
    @Inject(InterviewService)
    private readonly interviewService: InterviewService,
    @Inject(InterviewProgressService)
    private readonly progressService: InterviewProgressService,
    @Inject(InterviewRealtimeService)
    private readonly realtimeService: InterviewRealtimeService,
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
      isInterviewDuration(body?.durationMinutes)
        ? body.durationMinutes
        : INTERVIEW_DEFAULT_DURATION_MINUTES,
    );
  }

  // Literal paths are declared before `sessions/:sessionId`, so a segment
  // never gets swallowed as a session id.
  @Get("sessions")
  listSessions(@Req() request: RequestLike) {
    const session = this.readSession(request);
    return this.progressService.list(session.email);
  }

  @Get("progress")
  getProgress(@Req() request: RequestLike) {
    const session = this.readSession(request);
    return this.progressService.getProgress(session.email);
  }

  @Get("sessions/:sessionId")
  getSession(
    @Param("sessionId") sessionId: string,
    @Req() request: RequestLike,
  ) {
    const session = this.readSession(request);
    return this.interviewService.getSession(session.email, sessionId);
  }

  /**
   * Opens the live call: the browser's WebRTC offer in, OpenAI's answer out.
   * The audio then flows between the browser and OpenAI directly, while the
   * server follows the call on its own line (ADR-026).
   */
  @Post("sessions/:sessionId/realtime")
  startRealtimeCall(
    @Param("sessionId") sessionId: string,
    @Body() body: InterviewRealtimeCallRequest | undefined,
    @Req() request: RequestLike,
  ) {
    const session = this.readSession(request);

    return this.realtimeService.startCall(session.email, sessionId, body?.sdp);
  }

  /** Hangs the call up and stops the clock until the candidate resumes. */
  @Post("sessions/:sessionId/pause")
  pauseSession(
    @Param("sessionId") sessionId: string,
    @Req() request: RequestLike,
  ) {
    const session = this.readSession(request);

    return this.realtimeService.pauseCall(session.email, sessionId);
  }

  @Post("sessions/:sessionId/finish")
  async finishSession(
    @Param("sessionId") sessionId: string,
    @Req() request: RequestLike,
  ) {
    const session = this.readSession(request);
    // What was said in the last seconds of the call is saved before scoring.
    await this.realtimeService.endCall(session.email, sessionId);
    return this.interviewService.finishSession(session.email, sessionId);
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
