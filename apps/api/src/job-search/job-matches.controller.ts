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

/** Contracts a candidate can filter their own search by. */
const jobContractFilters = [
  "cdi",
  "cdd",
  "interim",
  "freelance",
  "stage",
  "alternance",
  "vie",
  "unknown",
] as const;

type RequestLike = {
  headers: { cookie?: string };
};

const MAX_HISTORY = 100;
const PAGE_SIZE = 20;
const MAX_QUERY_CHARS = 120;
/** The pool the morning selection reads from, and nothing older. */
const MAX_AGE_DAYS = 30;

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
    @Query("contrat") contract: string | undefined,
    @Query("teletravail") remote: string | undefined,
    @Query("page") page: string | undefined,
    @Req() request: RequestLike,
  ) {
    const session = requireSession(this.authService, request);
    const pageNumber = readPage(page);
    const found = await this.matches.searchOffers(session.email, {
      contractTypes: readContracts(contract),
      departments: readDepartments(department),
      limit: PAGE_SIZE,
      maxAgeDays: MAX_AGE_DAYS,
      offset: (pageNumber - 1) * PAGE_SIZE,
      query: (query ?? "").slice(0, MAX_QUERY_CHARS),
      remoteOnly: remote === "1" || remote === "true",
    });

    return { ...found, page: pageNumber, pageSize: PAGE_SIZE };
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

    return { applicationId: result.applicationId };
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

/** "44,75" — departments as the commune picker writes them. */
function readDepartments(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim().toUpperCase())
    .filter((entry) => /^(\d{2}|2[AB]|\d{3})$/.test(entry))
    .slice(0, 10);
}

function readContracts(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) =>
      (jobContractFilters as readonly string[]).includes(entry),
    ) as Array<(typeof jobContractFilters)[number]>;
}

function readPage(value: string | undefined): number {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 50) : 1;
}

function readDate(value: string | undefined): string | null {
  const date = value?.trim() ?? "";

  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}
