import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import {
  INTERVIEW_DEFAULT_DURATION_MINUTES,
  isInterviewDuration,
  type InterviewAnswerPartRequest,
  type InterviewRecruiterProfile,
  type InterviewSessionStartRequest,
  type InterviewTranscriptionChunkRequest,
} from "@cvforge/types";
import { AuthService } from "../auth/auth.service";
import { InterviewProgressService } from "./interview-progress.service";
import { InterviewTurnService } from "./interview-turn.service";
import { InterviewService } from "./interview.service";

type RequestLike = {
  headers: { cookie?: string };
};

/** The slice of the Express response the streamed turn needs. */
type SseResponse = {
  setHeader: (name: string, value: string) => void;
  flushHeaders?: () => void;
  write: (chunk: string) => boolean;
  end: () => void;
};

/**
 * Writes an event stream by hand, frame by frame.
 *
 * `@Sse` is not usable for these two routes: it targets the browser's
 * `EventSource`, which only ever issues GET, while a recorded answer is around
 * a megabyte of base64 and has to travel in a body. The client reads this with
 * `fetch` and a `ReadableStream` instead, which POSTs happily. Frames are
 * flushed as they come, so the voice starts playing while the rest is still
 * being generated.
 */
async function writeEventStream<T>(
  response: SseResponse,
  events: AsyncGenerator<T, void, undefined>,
): Promise<void> {
  response.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  response.setHeader("Cache-Control", "no-cache, no-transform");
  response.setHeader("Connection", "keep-alive");
  response.setHeader("X-Accel-Buffering", "no");
  response.flushHeaders?.();

  try {
    for await (const event of events) {
      response.write(`data: ${JSON.stringify(event)}\n\n`);
    }
  } catch (error) {
    // The headers are already sent, so the failure travels as a frame.
    const message = error instanceof Error ? error.message : "Le tour a echoue.";
    response.write(`data: ${JSON.stringify({ message, type: "error" })}\n\n`);
  } finally {
    response.end();
  }
}

@Controller("interviews")
export class InterviewController {
  constructor(
    @Inject(InterviewService)
    private readonly interviewService: InterviewService,
    @Inject(InterviewProgressService)
    private readonly progressService: InterviewProgressService,
    @Inject(InterviewTurnService)
    private readonly turnService: InterviewTurnService,
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

  /** One spoken turn: the candidate's answer in, the interviewer's voice out. */
  @Post("sessions/:sessionId/turn")
  async streamTurn(
    @Param("sessionId") sessionId: string,
    @Body() body: InterviewTranscriptionChunkRequest,
    @Req() request: RequestLike,
    @Res() response: SseResponse,
  ): Promise<void> {
    const session = this.readSession(request);

    await writeEventStream(
      response,
      this.turnService.streamTurn(session.email, sessionId, body),
    );
  }

  /**
   * One piece of an answer, while the candidate is still speaking.
   *
   * Four segments, so it cannot be mistaken for the three-segment turn route
   * above. Ordinary JSON rather than a stream: each piece is a quarter of a
   * second of audio and the reply is a count.
   */
  @Post("sessions/:sessionId/turn/chunk")
  async appendTurnChunk(
    @Param("sessionId") sessionId: string,
    @Body() body: InterviewAnswerPartRequest,
    @Req() request: RequestLike,
  ) {
    const session = this.readSession(request);

    return this.turnService.appendAnswerPart(session.email, sessionId, body);
  }

  /**
   * The interviewer's opening words, streamed the same way as a turn.
   *
   * The candidate used to have to speak first into a silent room. A recruiter
   * opens the interview, so the studio calls this as soon as the session is
   * on screen. It carries no body, but stays a POST because it writes: it
   * appends the greeting to the conversation.
   */
  @Post("sessions/:sessionId/opening")
  async streamOpening(
    @Param("sessionId") sessionId: string,
    @Req() request: RequestLike,
    @Res() response: SseResponse,
  ): Promise<void> {
    const session = this.readSession(request);

    await writeEventStream(
      response,
      this.turnService.streamOpening(session.email, sessionId),
    );
  }

  @Post("sessions/:sessionId/finish")
  async finishSession(
    @Param("sessionId") sessionId: string,
    @Req() request: RequestLike,
  ) {
    const session = this.readSession(request);
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
