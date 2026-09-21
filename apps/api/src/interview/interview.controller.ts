import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
  Res,
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

/** Adapts an async generator to the Observable `@Sse` expects. */
function toMessageEvents<T>(
  generator: AsyncGenerator<T, void, undefined>,
): Observable<MessageEvent> {
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

  @Post("sessions/:sessionId/chunks")
  transcribeChunk(
    @Param("sessionId") sessionId: string,
    @Body() body: InterviewTranscriptionChunkRequest,
    @Req() request: RequestLike,
  ) {
    const session = this.readSession(request);
    return this.interviewService.transcribeChunk(session.email, sessionId, body);
  }

  /**
   * One spoken turn: the candidate's answer in, the interviewer's voice out.
   *
   * Written to the response by hand rather than with `@Sse`. That decorator
   * targets the browser's `EventSource`, which only ever issues GET, while a
   * recorded answer is around a megabyte of base64 and has to travel in a
   * body. The client reads this with `fetch` and a `ReadableStream` instead,
   * which POSTs happily. Frames are flushed as they come, so the voice starts
   * playing while the rest is still being generated.
   */
  @Post("sessions/:sessionId/turn")
  async streamTurn(
    @Param("sessionId") sessionId: string,
    @Body() body: InterviewTranscriptionChunkRequest,
    @Req() request: RequestLike,
    @Res() response: SseResponse,
  ): Promise<void> {
    const session = this.readSession(request);

    response.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    response.setHeader("Cache-Control", "no-cache, no-transform");
    response.setHeader("Connection", "keep-alive");
    response.setHeader("X-Accel-Buffering", "no");
    response.flushHeaders?.();

    try {
      for await (const event of this.turnService.streamTurn(
        session.email,
        sessionId,
        body,
      )) {
        response.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } catch (error) {
      // The headers are already sent, so the failure travels as a frame.
      const message =
        error instanceof Error ? error.message : "Le tour a echoue.";
      response.write(`data: ${JSON.stringify({ message, type: "error" })}\n\n`);
    } finally {
      response.end();
    }
  }

  @Post("sessions/:sessionId/finish")
  async finishSession(
    @Param("sessionId") sessionId: string,
    @Req() request: RequestLike,
  ) {
    const session = this.readSession(request);
    return this.interviewService.finishSession(session.email, sessionId);
  }

  @Post("sessions/:sessionId/prefetch")
  async prefetchNextQuestion(
    @Param("sessionId") sessionId: string,
    @Req() request: RequestLike,
  ) {
    const session = this.readSession(request);
    return this.interviewService.prefetchNextQuestion(session.email, sessionId);
  }

  @Sse("sessions/:sessionId/respond")
  streamAIResponse(
    @Param("sessionId") sessionId: string,
    @Req() request: RequestLike,
  ): Observable<MessageEvent> {
    const session = this.readSession(request);

    return toMessageEvents(
      this.interviewService.streamAIResponse(session.email, sessionId),
    );
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
