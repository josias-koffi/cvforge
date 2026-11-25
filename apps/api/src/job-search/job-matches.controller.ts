import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { requireSession } from "../auth/request-session";
import { JobMatchesService } from "./job-matches.service";
import { jobMatchStatuses, type JobMatchStatus } from "./matches.types";
import {
  OFFER_SEARCH_PAGE_SIZE,
  readOfferSearchQuery,
} from "./offer-search-query";

type RequestLike = {
  headers: { cookie?: string };
};

const MAX_HISTORY = 100;

/** The candidate's own offers of the day. */
@Controller("job-search")
export class JobMatchesController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(JobMatchesService) private readonly matches: JobMatchesService,
  ) {}

  @Get("digest")
  async getDigest(
    @Query("date") date: string | undefined,
    @Req() request: RequestLike,
  ) {
    const session = requireSession(this.authService, request);

    return this.matches.getDigest(session.email, readDate(date));
  }

  @Get("history")
  async getHistory(
    @Query("limit") limit: string | undefined,
    @Req() request: RequestLike,
  ) {
    const session = requireSession(this.authService, request);
    const parsed = Number(limit);

    return {
      matches: await this.matches.listRecent(
        session.email,
        Number.isInteger(parsed) && parsed > 0
          ? Math.min(parsed, MAX_HISTORY)
          : MAX_HISTORY,
      ),
    };
  }

  /**
   * The candidate's own search over the offers we hold — the other way in,
   * next to the morning selection.
   */
  @Get("offers")
  async searchOffers(
    @Query("q") query: string | undefined,
    @Query("departement") department: string | undefined,
    @Query("ville") city: string | undefined,
    @Query("rayon") radius: string | undefined,
    @Query("contrat") contract: string | undefined,
    @Query("teletravail") remote: string | undefined,
    @Query("publiee") publishedWithin: string | undefined,
    @Query("tri") sort: string | undefined,
    @Query("page") page: string | undefined,
    @Req() request: RequestLike,
  ) {
    const session = requireSession(this.authService, request);
    const search = readOfferSearchQuery({
      contrat: contract,
      departement: department,
      page,
      publiee: publishedWithin,
      q: query,
      rayon: radius,
      teletravail: remote,
      tri: sort,
      ville: city,
    });
    const found = await this.matches.searchOffers(
      session.email,
      search.filters,
    );

    return {
      ...found,
      page: search.page,
      pageSize: OFFER_SEARCH_PAGE_SIZE,
      place: search.place,
    };
  }

  @Patch("offers/:jobId")
  async setStatus(
    @Param("jobId") jobId: string,
    @Body() body: { status?: string },
    @Req() request: RequestLike,
  ) {
    const session = requireSession(this.authService, request);
    const status = readStatus(body.status);
    const updated = await this.matches.setStatusForJob(
      session.email,
      decodeURIComponent(jobId),
      status,
    );

    if (!updated) throw new NotFoundException("Cette offre est introuvable.");

    return { match: updated };
  }

  /**
   * Turns an offer into an application, then hands the candidate over to the
   * CV generation they already know.
   */
  @Post("offers/:jobId/apply")
  async apply(@Param("jobId") jobId: string, @Req() request: RequestLike) {
    const session = requireSession(this.authService, request);
    const result = await this.matches.applyToJob(
      session.email,
      decodeURIComponent(jobId),
    );

    if (result.outcome === "not_found") {
      throw new NotFoundException("Cette offre est introuvable.");
    }

    if (result.outcome === "closed") {
      // 410, not 404: the offer existed and is gone — which is exactly what
      // the page needs to say, and no credit has been spent.
      throw new HttpException(
        "Cette offre n'est plus disponible.",
        HttpStatus.GONE,
      );
    }

    return {
      applicationId: result.applicationId,
      existing: result.existing ?? false,
    };
  }
}

function readStatus(value: string | undefined): JobMatchStatus {
  if (!value || !(jobMatchStatuses as readonly string[]).includes(value)) {
    throw new BadRequestException("Statut inconnu.");
  }

  // "applied" is set by applying, never by the client saying so.
  if (value === "applied") {
    throw new BadRequestException(
      "Ce statut est posé en créant la candidature.",
    );
  }

  return value as JobMatchStatus;
}

function readDate(value: string | undefined): string | null {
  const date = value?.trim() ?? "";

  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}
