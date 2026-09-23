import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { requireAdminSession } from "../auth/request-session";
import { BoardsService } from "./boards.service";
import { JobDigestService } from "./job-digest.service";
import {
  JOB_DIGEST_RUNS_STORE,
  type JobDigestRunsStore,
} from "./matches.types";
import { importSeededBoards } from "./sources/boards/boards-seed";

type RequestLike = {
  headers: { cookie?: string };
};

/** What the collection can be asked to reach back to — the API's own values. */
const ALLOWED_WINDOWS = [1, 7, 31];
const MAX_RUNS = 50;

/**
 * Running and watching the collection, for admins.
 *
 * The button only ever collects: it stores offers and stops there. Selecting
 * for each candidate and sending the morning e-mail stays with the scheduled
 * pass — a button that writes to every user because somebody wanted to test a
 * source is an incident waiting to happen.
 */
@Controller("admin/job-search")
export class JobSearchAdminController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(JobDigestService) private readonly digest: JobDigestService,
    @Inject(BoardsService) private readonly boards: BoardsService,
    @Inject(JOB_DIGEST_RUNS_STORE) private readonly runs: JobDigestRunsStore,
  ) {}

  @Get("runs")
  async listRuns(
    @Query("limit") limit: string | undefined,
    @Req() request: RequestLike,
  ) {
    requireAdminSession(this.authService, request);

    const parsed = Number(limit);

    return {
      runs: await this.runs.list(
        Number.isInteger(parsed) && parsed > 0
          ? Math.min(parsed, MAX_RUNS)
          : MAX_RUNS,
      ),
    };
  }

  /**
   * Starts a collection and answers at once: it takes minutes, and an HTTP
   * request must not wait for it. `started: false` means the database refused
   * — one is already running — which is the lock working, not a failure.
   */
  @Post("runs")
  @HttpCode(202)
  async startRun(
    @Body() body: { sinceDays?: number },
    @Req() request: RequestLike,
  ) {
    requireAdminSession(this.authService, request);

    const sinceDays = body.sinceDays ?? 1;

    if (!ALLOWED_WINDOWS.includes(sinceDays)) {
      throw new BadRequestException(
        "La fenêtre doit valoir 1, 7 ou 31 jours — les seules valeurs que France Travail accepte.",
      );
    }

    return this.digest.startBackgroundRun({ sinceDays });
  }

  /** Registers the companies shipped with the code. Replaying it is harmless. */
  @Post("boards/seed")
  async seedBoards(@Req() request: RequestLike) {
    requireAdminSession(this.authService, request);

    return importSeededBoards(this.boards);
  }
}
