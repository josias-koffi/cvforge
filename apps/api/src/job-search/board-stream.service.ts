import { randomUUID } from "node:crypto";
import { Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import type { BoardCadenceStore, FrequentBoard } from "./board-cadence.types";
import type { BoardsService } from "./boards.service";
import type { JobSourcesStore } from "./job-sources.types";
import type { StreamSink } from "./job-stream.service";
import type { JobStreamCursorsStore } from "./job-stream.types";
import { BOARD_REQUESTS_PER_SECOND } from "./sources/boards/board-http";
import { detectAtsBoard, type BoardProvider } from "./sources/boards/detect-board";

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;
const DEFAULT_INTERVAL_MINUTES = 30;
/** "Dont une offre a correspondu dans les 30 derniers jours." */
export const MATCH_WINDOW_MS = 30 * DAY_MS;
/**
 * How long a saved offer or an imported application keeps its company on the
 * frequent pass: a search lasts a few months, not for ever.
 */
export const FOLLOW_WINDOW_MS = 90 * DAY_MS;
/** A 429 or a 403 sends the board back to the daily pass for a day. */
export const REFUSAL_PAUSE_MS = DAY_MS;
/**
 * A cycle must fit in 15 minutes per recruiting software (ADR-027 §3): at
 * one call a second, 900 companies; at two, 1 800.
 */
export const CYCLE_BUDGET_SECONDS = 15 * 60;
const LEASE_MS = 30 * MINUTE_MS;
export const BOARDS_STREAM_KEY = "boards_frequent";

export interface BoardStreamConfig {
  intervalMs: number;
}

/**
 * Always on, like the France Travail flow: both feed the same live matching
 * (US-165). `JOB_BOARDS_INTERVAL_MINUTES` sets the pace, 30 by default.
 */
export function resolveBoardStreamConfig(
  env: NodeJS.ProcessEnv = process.env,
): BoardStreamConfig {
  const minutes = Number(env.JOB_BOARDS_INTERVAL_MINUTES);

  return {
    intervalMs:
      (Number.isFinite(minutes) && minutes >= 5 ? minutes : DEFAULT_INTERVAL_MINUTES) *
      MINUTE_MS,
  };
}

export type BoardTickResult =
  | { status: "skipped"; reason: string }
  | { status: "locked" }
  | {
      status: "done";
      boardsSelected: number;
      boardsRead: number;
      boardsFailed: number;
      newListings: number;
      /** Boards sent back to the daily pass for 24 hours. */
      paused: string[];
      /** Per provider, interested boards left to the daily pass by the cap. */
      overflow: Partial<Record<BoardProvider, number>>;
      error?: string;
    };

/**
 * Reads, every half hour, the boards of the companies candidates care about
 * (ADR-027, US-164): one of their offers matched a search in the last 30
 * days, or a candidate saved one, applied to one, or imported an application
 * from that board. Every other company keeps the daily pass.
 */
export class BoardStreamService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BoardStreamService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly boards: Pick<BoardsService, "readFrequent" | "supportedProviders">,
    private readonly cadence: BoardCadenceStore,
    private readonly cursors: JobStreamCursorsStore,
    private readonly sourceStates: Pick<JobSourcesStore, "listDisabled">,
    private readonly sink: StreamSink,
    private readonly config: BoardStreamConfig,
    private readonly now: () => number = Date.now,
    private readonly owner: string = randomUUID(),
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.tick().catch((error: unknown) => {
        this.logger.error(`Frequent board pass failed: ${String(error)}`);
      });
    }, this.config.intervalMs);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async tick(): Promise<BoardTickResult> {
    if (this.running) return { reason: "already running", status: "skipped" };

    const lease = await this.cursors.claim(BOARDS_STREAM_KEY, this.owner, LEASE_MS);
    if (!lease) return { status: "locked" };

    this.running = true;
    let result: BoardTickResult | undefined;

    try {
      result = await this.readCycle();

      return result;
    } finally {
      this.running = false;
      await this.cursors.release(
        BOARDS_STREAM_KEY,
        this.owner,
        result ? { ...result, at: new Date(this.now()).toISOString() } : undefined,
      );
    }
  }

  private async readCycle(): Promise<BoardTickResult> {
    const now = this.now();
    const { selected, overflow } = await this.selectBoards(now);
    const report = await this.boards.readFrequent(selected);
    const paused: string[] = [];

    for (const refused of report.refused) {
      await this.cadence.pauseFrequent(
        refused.provider,
        refused.boardToken,
        new Date(now + REFUSAL_PAUSE_MS),
      );
      paused.push(`${refused.provider}/${refused.boardToken} (${refused.status})`);
    }

    if (Object.keys(overflow).length > 0) {
      this.logger.warn(
        `Frequent pass over budget, left to the daily pass: ${JSON.stringify(overflow)}`,
      );
    }

    const result = {
      boardsFailed: report.boardsFailed,
      boardsRead: report.boardsRead,
      boardsSelected: selected.length,
      newListings: report.newListings.length,
      overflow,
      paused,
      status: "done" as const,
    };

    try {
      await this.sink(report.newListings);
    } catch (error) {
      // The postings are recorded as seen: they arrive with tomorrow's daily
      // pass instead, which is the rhythm they would have had anyway.
      this.logger.warn(`Frequent board sink failed: ${String(error)}`);

      return { ...result, error: String(error) };
    }

    return result;
  }

  /**
   * The interested boards, most recent interest first, capped per provider so
   * a cycle fits its budget. A provider or a board an admin switched off is
   * left out, like in the daily pass.
   */
  async selectBoards(now: number): Promise<{
    selected: FrequentBoard[];
    overflow: Partial<Record<BoardProvider, number>>;
  }> {
    const [interested, followed, disabled] = await Promise.all([
      this.cadence.listInterested({
        followedSince: new Date(now - FOLLOW_WINDOW_MS),
        matchedSince: new Date(now - MATCH_WINDOW_MS),
        now: new Date(now),
      }),
      this.followedThroughApplications(now),
      this.sourceStates.listDisabled(),
    ]);
    const supported = new Set(this.boards.supportedProviders());
    const byKey = new Map<string, FrequentBoard>();

    for (const board of [...interested, ...followed]) {
      if (!supported.has(board.provider) || disabled.has(board.provider)) continue;

      const key = `${board.provider}/${board.boardToken}`;
      const known = byKey.get(key);
      if (!known || known.interestAt < board.interestAt) byKey.set(key, board);
    }

    const selected: FrequentBoard[] = [];
    const overflow: Partial<Record<BoardProvider, number>> = {};
    const taken = new Map<BoardProvider, number>();
    const ordered = [...byKey.values()].sort(
      (left, right) => right.interestAt.getTime() - left.interestAt.getTime(),
    );

    for (const board of ordered) {
      const count = taken.get(board.provider) ?? 0;

      if (count >= cycleCapacity(board.provider)) {
        overflow[board.provider] = (overflow[board.provider] ?? 0) + 1;
        continue;
      }

      taken.set(board.provider, count + 1);
      selected.push(board);
    }

    return { overflow, selected };
  }

  /** Companies whose offer a candidate imported into an application. */
  private async followedThroughApplications(now: number): Promise<FrequentBoard[]> {
    const latest = new Map<string, FrequentBoard>();

    for (const application of await this.cadence.listApplicationUrls(
      new Date(now - FOLLOW_WINDOW_MS),
    )) {
      const detected = detectAtsBoard(application.url);
      if (!detected) continue;

      const key = `${detected.provider}/${detected.boardToken}`;
      const known = latest.get(key);
      if (!known || known.interestAt < application.createdAt) {
        latest.set(key, { ...detected, interestAt: application.createdAt });
      }
    }

    const readable = new Set(
      (await this.cadence.filterReadable([...latest.values()], new Date(now))).map(
        (board) => `${board.provider}/${board.boardToken}`,
      ),
    );

    return [...latest.entries()]
      .filter(([key]) => readable.has(key))
      .map(([, board]) => board);
  }
}

/** One call per board and per cycle, at the provider's pace (ADR-027 §3). */
export function cycleCapacity(provider: BoardProvider): number {
  return BOARD_REQUESTS_PER_SECOND[provider] * CYCLE_BUDGET_SECONDS;
}
