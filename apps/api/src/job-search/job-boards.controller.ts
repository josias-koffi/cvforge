import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { requireAdminSession } from "../auth/request-session";
import { BoardsService } from "./boards.service";
import { JOB_BOARDS_STORE, type JobBoardsStore } from "./boards.types";
import { JOBS_STORE, type JobsStore } from "./jobs.types";
import {
  boardProviders,
  detectAtsBoard,
  type BoardProvider,
} from "./sources/boards/detect-board";

type RequestLike = {
  headers: { cookie?: string };
};

const MAX_PAGE_SIZE = 500;

/**
 * The company registry, for admins.
 *
 * It fills itself (Common Crawl, France Travail partner links, candidates'
 * imports), so this exists to *see* what it collected and to overrule it:
 * adding a company nobody found, and disabling one that should not be read.
 */
@Controller("admin/job-boards")
export class JobBoardsController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(BoardsService) private readonly boards: BoardsService,
    @Inject(JOB_BOARDS_STORE) private readonly store: JobBoardsStore,
    @Inject(JOBS_STORE) private readonly jobs: JobsStore,
  ) {}

  /**
   * The merges that needed judgement, newest first. Everything else was
   * decided by a shared link or an exact key, and needs no review.
   */
  @Get("merges")
  async listFuzzyMerges(
    @Query("limit") limit: string | undefined,
    @Req() request: RequestLike,
  ) {
    requireAdminSession(this.authService, request);

    return { merges: await this.jobs.listRecentFuzzyMatches(readLimit(limit, 50)) };
  }

  /** Undoes a wrong merge: the advert becomes an offer of its own again. */
  @Post("merges/:listingId/detach")
  async detachListing(
    @Param("listingId") listingId: string,
    @Req() request: RequestLike,
  ) {
    requireAdminSession(this.authService, request);

    const job = await this.jobs.detachListing(decodeURIComponent(listingId));
    if (!job) throw new NotFoundException("Cette annonce est introuvable.");

    return { job };
  }

  @Get()
  async listBoards(
    @Query("provider") provider: string | undefined,
    @Query("limit") limit: string | undefined,
    @Req() request: RequestLike,
  ) {
    requireAdminSession(this.authService, request);

    return {
      boards: await this.store.list({
        limit: readLimit(limit),
        ...(provider ? { provider: readProvider(provider) } : {}),
      }),
      /** The providers that can actually be collected today. */
      supportedProviders: this.boards.supportedProviders(),
    };
  }

  /** Adds a company from the URL of one of its job adverts. */
  @Post()
  async addBoard(
    @Body() body: { url?: string; companyName?: string },
    @Req() request: RequestLike,
  ) {
    requireAdminSession(this.authService, request);

    const url = body.url?.trim() ?? "";
    if (!url) throw new BadRequestException("Une URL d'offre est requise.");

    if (!detectAtsBoard(url)) {
      throw new BadRequestException(
        "Cette URL ne correspond à aucun logiciel de recrutement connu.",
      );
    }

    const board = await this.boards.registerFromUrl(
      url,
      "admin",
      body.companyName,
    );

    if (!board) {
      throw new BadRequestException("Cette entreprise n'a pas pu être ajoutée.");
    }

    return { board };
  }

  @Patch(":provider/:boardToken")
  async setEnabled(
    @Param("provider") provider: string,
    @Param("boardToken") boardToken: string,
    @Body() body: { enabled?: boolean },
    @Req() request: RequestLike,
  ) {
    requireAdminSession(this.authService, request);

    if (typeof body.enabled !== "boolean") {
      throw new BadRequestException("Le champ `enabled` est requis.");
    }

    const board = await this.store.setEnabled(
      readProvider(provider),
      decodeURIComponent(boardToken),
      body.enabled,
    );

    if (!board) throw new NotFoundException("Cette entreprise est introuvable.");

    return { board };
  }
}

function readProvider(value: string): BoardProvider {
  const provider = decodeURIComponent(value).trim().toLowerCase();

  if (!(boardProviders as readonly string[]).includes(provider)) {
    throw new BadRequestException("Logiciel de recrutement inconnu.");
  }

  return provider as BoardProvider;
}

function readLimit(value: string | undefined, fallback = MAX_PAGE_SIZE): number {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0
    ? Math.min(parsed, MAX_PAGE_SIZE)
    : fallback;
}
