import { randomUUID } from "node:crypto";
import type { AtsScanStore, NewAtsScan, StoredAtsScan } from "../ats.types";

/**
 * The store the service tests run against, so orchestration is exercised
 * without standing up Postgres. `PgAtsScanStore` has its own PGlite tests.
 */
export class InMemoryAtsScanStore implements AtsScanStore {
  readonly scans: StoredAtsScan[] = [];

  constructor(private readonly now: () => string = () => new Date().toISOString()) {}

  async create(scan: NewAtsScan) {
    const stored: StoredAtsScan = {
      createdAt: this.now(),
      email: null,
      engineVersion: scan.result.engineVersion,
      expiresAt: scan.expiresAt,
      id: randomUUID(),
      ipHash: scan.ipHash,
      locale: scan.locale,
      overallScore: scan.result.overallScore,
      result: scan.result,
      source: scan.source,
      unlockedAt: null,
    };

    this.scans.push(stored);

    return stored;
  }

  async findById(id: string) {
    return this.scans.find((scan) => scan.id === id) ?? null;
  }

  async countSince(since: string) {
    return this.scans.filter((scan) => scan.createdAt >= since).length;
  }

  async unlock(id: string, email: string, at: string) {
    const scan = this.scans.find(
      (candidate) => candidate.id === id && candidate.unlockedAt === null,
    );

    if (!scan) return null;

    scan.email = email;
    scan.unlockedAt = at;

    return scan;
  }

  async deleteExpired(now: string) {
    const expired = this.scans.filter((scan) => scan.expiresAt <= now);

    for (const scan of expired) {
      this.scans.splice(this.scans.indexOf(scan), 1);
    }

    return expired.length;
  }
}
