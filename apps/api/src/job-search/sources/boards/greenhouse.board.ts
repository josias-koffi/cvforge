import type { NormalizedJobListing } from "../../job-search.types";
import {
  classifyContract,
  htmlToText,
  normalizeLocation,
} from "../../job-listing.normalize";
import type { BoardHttpClient } from "./board-http";
import type { CompanyBoardAdapter } from "./board.types";

/**
 * Greenhouse job board, as served to a company's own careers page.
 *
 * `content` is double-escaped HTML, and `metadata` carries the recruiter's own
 * fields — including, on many boards, the employment type, which is the only
 * place a Greenhouse offer says whether it is an internship.
 */
interface GreenhouseJob {
  id?: number;
  absolute_url?: string;
  title?: string;
  content?: string;
  updated_at?: string;
  first_published?: string;
  company_name?: string;
  location?: { name?: string };
  metadata?: Array<{ name?: string; value?: unknown }>;
}

interface GreenhouseBoardPayload {
  jobs?: GreenhouseJob[];
}

const EMPLOYMENT_METADATA = ["employment type", "contract type", "type de contrat"];

export class GreenhouseBoard implements CompanyBoardAdapter {
  readonly provider = "greenhouse" as const;

  constructor(private readonly http: BoardHttpClient) {}

  async fetchBoard(boardToken: string): Promise<NormalizedJobListing[]> {
    const board = await this.http.getJson<GreenhouseBoardPayload>(
      this.provider,
      `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs?content=true`,
    );

    return (board.jobs ?? [])
      .map((job) => this.toListing(job, boardToken))
      .filter((listing): listing is NormalizedJobListing => listing !== null);
  }

  private toListing(
    job: GreenhouseJob,
    boardToken: string,
  ): NormalizedJobListing | null {
    const externalId = job.id ? String(job.id) : "";
    const title = job.title?.trim() ?? "";
    if (!externalId || !title) return null;

    const location = normalizeLocation(job.location?.name ?? "");
    if (!location.inFrance && !location.remote) return null;

    const description = htmlToText(job.content ?? "");
    const url = job.absolute_url?.trim() ?? "";

    return {
      applyUrl: url,
      companyAnonymous: false,
      companyName: job.company_name?.trim() || boardToken,
      contractType: classifyContract({
        description,
        employmentType: employmentType(job),
        title,
      }),
      department: location.department,
      description,
      externalId,
      latitude: null,
      locationLabel: location.label,
      longitude: null,
      partnerUrls: [],
      // `first_published` is the creation date; `updated_at` moves whenever the
      // recruiter edits a typo and would make an old offer look new.
      publishedAt: isoDate(job.first_published),
      raw: job,
      remote: location.remote,
      salaryLabel: "",
      source: this.provider,
      title,
      url,
    };
  }
}

function employmentType(job: GreenhouseJob): string {
  const entry = (job.metadata ?? []).find((item) =>
    EMPLOYMENT_METADATA.includes((item.name ?? "").trim().toLowerCase()),
  );

  return typeof entry?.value === "string" ? entry.value : "";
}

export function isoDate(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;

  const parsed = typeof value === "number" ? value : Date.parse(value);

  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}
