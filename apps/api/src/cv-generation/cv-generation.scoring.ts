import {
  fromCvDocument,
  scoreAts,
  type AtsOfferContext,
  type AtsScoreResult,
} from "@cvforge/ats-score";
import type { CVDocumentContent, ExtractedOfferFields } from "@cvforge/types";

/**
 * The ATS score attached to a generated CV.
 *
 * Free in every sense: no credit is charged and no model is called. The
 * document is already structured, so the deterministic rules have everything
 * they need — which is what lets the score be recomputed on every save rather
 * than only at generation.
 *
 * `machineReadability` stays unavailable here: there is no file to inspect
 * until the PDF is exported, and the engine renormalises over what it can see.
 */
export function scoreGeneratedCv(
  content: CVDocumentContent,
  extracted: ExtractedOfferFields | null,
): AtsScoreResult {
  return scoreAts(fromCvDocument(content), {
    offer: toOfferContext(extracted),
  });
}

/**
 * The offer is already structured on an application, so `keywords` is
 * observable here — unlike the public scan, where a visitor may not have one.
 */
function toOfferContext(
  extracted: ExtractedOfferFields | null,
): AtsOfferContext | null {
  if (!extracted) return null;

  return {
    requirements: extracted.requirements ?? [],
    responsibilities: extracted.responsibilities ?? [],
    title: extracted.title ?? "",
  };
}

/**
 * Scores without ever being the reason a generation fails.
 *
 * A CV the user has paid for must reach them even if the scoring engine throws
 * on some shape of document we did not anticipate. The failure costs the badge,
 * never the document.
 */
export function scoreGeneratedCvSafely(
  content: CVDocumentContent,
  extracted: ExtractedOfferFields | null,
): AtsScoreResult | null {
  try {
    return scoreGeneratedCv(content, extracted);
  } catch (error: unknown) {
    console.error("[cv-generation] ATS scoring failed", error);

    return null;
  }
}
