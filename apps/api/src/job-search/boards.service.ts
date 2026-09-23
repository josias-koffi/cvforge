import { Injectable, Logger } from "@nestjs/common";
import type { NormalizedJobListing } from "./job-search.types";
import type { BoardOrigin, JobBoardsStore, RegisteredBoard } from "./boards.types";
import { BoardHttpClient } from "./sources/boards/board-http";
import { BoardNotFoundError, type CompanyBoardAdapter } from "./sources/boards/board.types";
import { AshbyBoard } from "./sources/boards/ashby.board";
import { detectAtsBoard, type BoardProvider } from "./sources/boards/detect-board";
import { GreenhouseBoard } from "./sources/boards/greenhouse.board";
import { LeverBoard } from "./sources/boards/lever.board";
import { SmartRecruitersBoard } from "./sources/boards/smartrecruiters.board";

export interface BoardCollectionReport {
  boardsRead: number;
  boardsFailed: number;
  boardsRetired: number;
  listings: NormalizedJobListing[];
}

/**
 * Reads every company in the registry, and grows the registry from the links
 * the product already sees.
 *
 * Four providers have an adapter: Greenhouse, Lever, Ashby, SmartRecruiters.
 * The others (Workable, Recruitee, Personio, Welcome Kit) are still
 * *registered* when a link points at them — their companies are collected the
 * day their adapter lands, instead of being lost in the meantime.
 */
@Injectable()
export class BoardsService {
  private readonly logger = new Logger(BoardsService.name);
  private readonly adapters: Map<BoardProvider, CompanyBoardAdapter>;

  constructor(
    private readonly store: JobBoardsStore,
    http: BoardHttpClient = new BoardHttpClient(),
  ) {
    this.adapters = new Map<BoardProvider, CompanyBoardAdapter>([
      ["ashby", new AshbyBoard(http)],
      ["greenhouse", new GreenhouseBoard(http)],
      ["lever", new LeverBoard(http)],
      ["smartrecruiters", new SmartRecruitersBoard(http)],
    ]);
  }

  /**
   * Registers the company behind a job advert URL, if it is on a job board we
   * know. Called with links candidates import and with the partner links
   * France Travail carries — both are free, and both are how the registry
   * grows without anybody maintaining a list.
   */
  async registerFromUrl(
    url: string,
    origin: BoardOrigin,
    companyName?: string,
  ): Promise<RegisteredBoard | null> {
    const detected = detectAtsBoard(url);
    if (!detected) return null;

    try {
      return await this.store.register({ ...detected, companyName, origin });
    } catch (error) {
      // Registering is a side effect of somebody else's action — importing an
      // application, collecting an offer. It must never fail that action.
      this.logger.warn(`Could not register ${url}: ${String(error)}`);
      return null;
    }
  }

  async registerManyFromUrls(
    urls: readonly string[],
    origin: BoardOrigin,
  ): Promise<number> {
    let registered = 0;

    for (const url of urls) {
      if (await this.registerFromUrl(url, origin)) registered += 1;
    }

    return registered;
  }

  /**
   * One pass over the whole registry. A company that fails is counted against
   * itself and skipped; it never stops the others.
   */
  async collect(): Promise<BoardCollectionReport> {
    const boards = await this.store.listEnabled();
    const report: BoardCollectionReport = {
      boardsFailed: 0,
      boardsRead: 0,
      boardsRetired: 0,
      listings: [],
    };

    for (const board of boards) {
      const adapter = this.adapters.get(board.provider);
      // A provider with no adapter yet stays registered and untouched: no
      // fetch, no failure counted against it.
      if (!adapter) continue;

      try {
        const listings = await adapter.fetchBoard(board.boardToken);
        report.listings.push(...listings);
        report.boardsRead += 1;
        await this.store.recordFetch(board.provider, board.boardToken, {
          failed: false,
          jobCount: listings.length,
          status: "ok",
        });
      } catch (error) {
        report.boardsFailed += 1;
        const gone = error instanceof BoardNotFoundError;
        if (gone) report.boardsRetired += 1;

        this.logger.warn(
          `${board.provider}/${board.boardToken}: ${String(error)}`,
        );
        await this.store.recordFetch(board.provider, board.boardToken, {
          failed: true,
          gone,
          jobCount: 0,
          status: gone ? "404" : String(error).slice(0, 200),
        });
      }
    }

    return report;
  }

  /** The providers a company can actually be collected from today. */
  supportedProviders(): BoardProvider[] {
    return [...this.adapters.keys()];
  }
}
