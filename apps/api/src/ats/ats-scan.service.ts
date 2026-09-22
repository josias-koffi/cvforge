import {
  parseCvText,
  scoreAts,
  type AtsFindingCode,
  type AtsOfferContext,
  type AtsScoreResult,
} from "@cvforge/ats-score";
import {
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import { buildOfferPreview } from "../applications/offer-extraction";
import {
  extractCvText,
  type CvSourceFile,
} from "../cv-generation/cv-text-extraction";
import type { AtsImpactService } from "./ats-impact.service";
import {
  ATS_SCAN_STORE,
  type AtsScanStore,
  type PublicAtsScanResponse,
  type StoredAtsScan,
} from "./ats.types";
import { assertScannableFile } from "./ats.validation";

export const SCAN_RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Below this there is nothing to score, whatever the file claimed to be. */
const MIN_SCANNABLE_CHARS = 120;
const FREE_HIGHLIGHTS = 3;

export const NOT_ENOUGH_TEXT_MESSAGE =
  "Ce CV ne contient pas assez de texte exploitable pour etre analyse.";
export const BUDGET_EXHAUSTED_MESSAGE =
  "L'analyse gratuite est momentanement indisponible. Reessayez demain.";

export type ScanRequest = {
  file: CvSourceFile | undefined;
  offerText: string | null;
  locale: string;
  ip: string | null;
};

/**
 * The public scan, end to end.
 *
 * Two invariants hold this together and are both asserted by tests:
 *
 * 1. **No CV text is persisted.** The buffer and the extracted text live only
 *    for the duration of the request; only scores and finding codes are
 *    written (ADR-022).
 * 2. **The free tier never receives the dimensions.** The gate is the payload,
 *    not a blur in the page.
 */
@Injectable()
export class AtsScanService {
  constructor(
    @Inject(ATS_SCAN_STORE) private readonly store: AtsScanStore,
    private readonly impactService: AtsImpactService,
    private readonly dailyBudget: number,
    private readonly ipHashSecret: string,
    private readonly now: () => number = Date.now,
  ) {}

  async scanPublic(request: ScanRequest): Promise<PublicAtsScanResponse> {
    assertScannableFile(request.file);

    // Checked before any parsing or model call: the point of a budget is to
    // stop spending, so it must gate the expensive part, not follow it.
    await this.assertBudgetAvailable();

    const { result, partial } = await this.score(
      request.file,
      request.offerText,
    );

    const scan = await this.store.create({
      expiresAt: new Date(this.now() + SCAN_RETENTION_DAYS * DAY_MS).toISOString(),
      ipHash: this.hashIp(request.ip),
      locale: request.locale,
      result,
      source: "public",
    });

    return toPublicResponse(scan, partial);
  }

  /**
   * OCR is refused here, unlike the authenticated import: it costs seconds of
   * CPU on the API process with no job queue behind it. A scanned PDF is not an
   * error — it scores on its file signals alone, `machineReadability` on the
   * floor, which is the most useful thing this page can tell a candidate.
   */
  private async score(file: CvSourceFile, offerText: string | null) {
    const extraction = await extractCvText(file, { allowOcr: false });
    const hasTextLayer = extraction.signals?.hasTextLayer ?? true;

    if (extraction.text.length < MIN_SCANNABLE_CHARS && hasTextLayer) {
      throw new UnprocessableEntityException(NOT_ENOUGH_TEXT_MESSAGE);
    }

    const offer = offerText ? toOfferContext(offerText) : null;
    const document = parseCvText(
      extraction.text,
      extraction.signals
        ? {
            columnSuspicion: extraction.signals.columnSuspicion,
            hasTextLayer: extraction.signals.hasTextLayer,
            kind: extraction.kind === "docx" ? "docx" : "pdf",
            mojibakeRatio: extraction.signals.mojibakeRatio,
            pageCount: extraction.signals.pageCount,
          }
        : undefined,
    );

    // The model is consulted only when there is prose to judge; on a scanned
    // file it would be asked to rate an empty string.
    const llm = hasTextLayer
      ? await this.impactService.assess(extraction.text, offer)
      : null;

    return { partial: !hasTextLayer, result: scoreAts(document, { llm, offer }) };
  }

  private async assertBudgetAvailable() {
    const since = new Date(this.now() - DAY_MS).toISOString();

    if ((await this.store.countSince(since)) >= this.dailyBudget) {
      throw new ServiceUnavailableException(BUDGET_EXHAUSTED_MESSAGE);
    }
  }

  /** Salted so the hashes are not a rainbow table of the IPv4 space. */
  private hashIp(ip: string | null) {
    if (!ip) return null;

    return createHash("sha256").update(`${ip}${this.ipHashSecret}`).digest("hex");
  }
}

/**
 * The pasted offer, turned into something `keywords` can match against — with
 * no model call.
 *
 * Structuring the offer properly (title, requirements, responsibilities) is an
 * LLM job in this codebase, and paying for one on a free public route to feed a
 * bag-of-words comparison would be wasteful: the dimension only ever extracts
 * the terms again. The whole text is handed over as a single requirement, and
 * the stopword filter in `scoreKeywords` removes the recruiting boilerplate.
 */
function toOfferContext(offerText: string): AtsOfferContext {
  return {
    requirements: [offerText],
    responsibilities: [],
    title: buildOfferPreview(offerText, 120),
  };
}

/**
 * The free payload. `dimensions` is absent by construction rather than
 * stripped: there is no code path that puts it on the wire.
 */
function toPublicResponse(
  scan: StoredAtsScan,
  partial: boolean,
): PublicAtsScanResponse {
  const { result } = scan;

  return {
    band: result.band,
    expiresAt: scan.expiresAt,
    highlights: pickHighlights(result),
    lockedFindingCount: Math.max(0, result.findings.length - FREE_HIGHLIGHTS),
    overallScore: result.overallScore,
    partial,
    scanId: scan.id,
    scoredDimensionCount: result.dimensions.filter(
      (dimension) => dimension.status === "scored",
    ).length,
  };
}

/** The worst findings first — they are already sorted by severity. */
function pickHighlights(result: AtsScoreResult): AtsFindingCode[] {
  return result.findings.slice(0, FREE_HIGHLIGHTS).map((finding) => finding.code);
}
