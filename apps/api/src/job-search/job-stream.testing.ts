import type { JobStreamCursorsStore, StreamKey } from "./job-stream.types";

/** The database lease, in memory, for tests: one holder, one cursor. */
export class MemoryCursors implements JobStreamCursorsStore {
  cursorAt: Date | null = null;
  holder: string | null = null;
  stolen = false;
  reports = new Map<StreamKey, Record<string, unknown>>();

  async claim(_source: StreamKey, owner: string) {
    if (this.holder && this.holder !== owner) return null;
    this.holder = owner;
    return { cursorAt: this.cursorAt };
  }

  async advance(_source: StreamKey, owner: string, cursorAt: Date) {
    if (this.stolen || this.holder !== owner) return false;
    this.cursorAt = cursorAt;
    return true;
  }

  async release(
    source: StreamKey,
    owner: string,
    report?: Record<string, unknown>,
  ) {
    if (this.holder === owner) this.holder = null;
    if (report) this.reports.set(source, report);
  }

  async lastReports() {
    return this.reports;
  }
}
