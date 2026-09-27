import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  ATS_SCAN_STORE,
  type AtsScanReport,
  type AtsScanStore,
  type AtsScanSummary,
  type StoredAtsScan,
} from "./ats.types";

export const REPORT_NOT_FOUND_MESSAGE = "Analyse introuvable.";

function toSummary(scan: StoredAtsScan): AtsScanSummary {
  return {
    band: scan.result.band,
    expiresAt: scan.expiresAt,
    overallScore: scan.overallScore,
    scanId: scan.id,
    // Only unlocked scans reach here: the store filters on it.
    unlockedAt: scan.unlockedAt!,
  };
}

/**
 * The reports a user unlocked on the landing before or after signing up,
 * found by address: a scan never holds a foreign key to an account (US-133).
 */
@Injectable()
export class AtsReportsService {
  constructor(
    @Inject(ATS_SCAN_STORE) private readonly store: AtsScanStore,
    private readonly now: () => number = Date.now,
  ) {}

  async list(email: string): Promise<AtsScanSummary[]> {
    const scans = await this.store.findUnlockedByEmail(email, this.nowIso());

    return scans.map(toSummary);
  }

  /**
   * One 404 for a scan that does not exist, expired, or was unlocked by
   * someone else: telling them apart would confirm a stranger's scan id.
   */
  async get(email: string, scanId: string): Promise<AtsScanReport> {
    const scan = await this.store.findById(scanId);

    if (
      !scan ||
      scan.email !== email ||
      scan.unlockedAt === null ||
      scan.expiresAt <= this.nowIso()
    ) {
      throw new NotFoundException(REPORT_NOT_FOUND_MESSAGE);
    }

    return { ...toSummary(scan), result: scan.result };
  }

  private nowIso() {
    return new Date(this.now()).toISOString();
  }
}
