import type { AtsFindingCode, AtsScoreBand, AtsScoreResult } from "@cvforge/ats-score";

export type AtsScanSource = "public" | "app";

export type StoredAtsScan = {
  id: string;
  source: AtsScanSource;
  locale: string;
  engineVersion: string;
  overallScore: number;
  result: AtsScoreResult;
  ipHash: string | null;
  email: string | null;
  unlockedAt: string | null;
  createdAt: string;
  expiresAt: string;
};

/** Everything a scan needs at creation. No CV text: none is ever stored. */
export type NewAtsScan = {
  source: AtsScanSource;
  locale: string;
  result: AtsScoreResult;
  ipHash: string | null;
  expiresAt: string;
};

export interface AtsScanStore {
  create(scan: NewAtsScan): Promise<StoredAtsScan>;
  findById(id: string): Promise<StoredAtsScan | null>;
  /** Scans created since `since`, used to charge the daily budget. */
  countSince(since: string): Promise<number>;
  unlock(id: string, email: string, at: string): Promise<StoredAtsScan | null>;
  /** The reports this address unlocked, still within retention, newest first. */
  findUnlockedByEmail(email: string, now: string): Promise<StoredAtsScan[]>;
  deleteExpired(now: string): Promise<number>;
}

export const ATS_SCAN_STORE = Symbol("ATS_SCAN_STORE");

/**
 * What an unauthenticated caller gets back.
 *
 * Deliberately **not** the dimensions: the gate is the payload itself, not a
 * blur in the page. Anything the free tier must not reveal simply never
 * crosses the wire.
 */
export type PublicAtsScanResponse = {
  scanId: string;
  overallScore: number;
  band: AtsScoreBand;
  /** Three codes: the strongest dimension, then the two worst findings. */
  highlights: AtsFindingCode[];
  scoredDimensionCount: number;
  /** "12 further points detected" — the hook for the unlock. */
  lockedFindingCount: number;
  /** True when the file had no text layer and OCR was refused. */
  partial: boolean;
  expiresAt: string;
};

/** One report a signed-in user unlocked on the landing (US-133). */
export type AtsScanSummary = {
  scanId: string;
  overallScore: number;
  band: AtsScoreBand;
  unlockedAt: string;
  /** The report is purged past this point; the app says so. */
  expiresAt: string;
};

export type AtsScanReport = AtsScanSummary & { result: AtsScoreResult };
