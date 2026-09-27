import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { requireAdminSession } from "../auth/request-session";
import { BoardsService } from "./boards.service";
import { JobDigestService } from "./job-digest.service";
import { jobSources, type JobSource } from "./job-search.types";
import {
  JOB_SOURCES_STORE,
  type JobSourcesStore,
  type JobSourceState,
} from "./job-sources.types";
import {
  JOB_DIGEST_RUNS_STORE,
  type JobDigestRunsStore,
} from "./matches.types";
import { resolveLaBonneAlternanceConfig } from "./sources/la-bonne-alternance.config";
import { FtHttpClient } from "../france-travail/ft-http.client";
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
    @Inject(JOB_SOURCES_STORE) private readonly sources: JobSourcesStore,
    @Inject(FtHttpClient) private readonly franceTravail: FtHttpClient,
  ) {}

  /**
   * Every source the code knows, with what is stored about it.
   *
   * The list comes from the code, not from the table: a source is described
   * once, and one added later shows up without a migration. Availability and
   * activation are reported apart — a source with no credentials is inert
   * whatever the switch says, and the screen must not conflate the two.
   */
  @Get("sources")
  async listSources(@Req() request: RequestLike) {
    requireAdminSession(this.authService, request);

    const stored = new Map(
      (await this.sources.list()).map((state) => [state.source, state]),
    );
    const collectable = new Set<string>([
      ...this.boards.supportedProviders(),
      "france_travail",
      "la_bonne_alternance",
    ]);

    return {
      sources: jobSources.map((source) => ({
        ...defaultState(source),
        ...stored.get(source),
        /** Has an adapter at all — unwritten sources are shown as such. */
        implemented: collectable.has(source),
        /** Configured to be able to answer, credentials included. */
        available: isAvailable(source, this.franceTravail),
      })),
    };
  }

  @Patch("sources/:source")
  async setSourceEnabled(
    @Param("source") source: string,
    @Body() body: { enabled?: boolean },
    @Req() request: RequestLike,
  ) {
    requireAdminSession(this.authService, request);

    if (typeof body.enabled !== "boolean") {
      throw new BadRequestException("Le champ `enabled` est requis.");
    }

    if (!(jobSources as readonly string[]).includes(source)) {
      throw new BadRequestException("Source inconnue.");
    }

    return {
      source: await this.sources.setEnabled(source as JobSource, body.enabled),
    };
  }

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

function defaultState(source: JobSource): JobSourceState {
  return {
    consecutiveFailures: 0,
    enabled: true,
    lastListingCount: 0,
    lastRunAt: null,
    lastStatus: null,
    source,
  };
}

/**
 * Whether the source could answer at all today.
 *
 * The two public APIs need a key; the recruiting software boards are public,
 * and a source with no adapter is never available whatever the environment
 * says.
 */
function isAvailable(source: JobSource, franceTravail: FtHttpClient): boolean {
  if (source === "france_travail") {
    return franceTravail.isEnabled("offres");
  }

  if (source === "la_bonne_alternance") {
    return resolveLaBonneAlternanceConfig().enabled;
  }

  return source !== "adzuna";
}
