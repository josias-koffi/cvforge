import { matchOfferKeywords } from "@cvforge/ats-score";
import { publicError, type PublicKeywordMatchResponse } from "@cvforge/types";
import {
  BadRequestException,
  Injectable,
  UnprocessableEntityException,
} from "@nestjs/common";
import { assertScannableFile } from "../ats/ats.validation";
import {
  extractCvText,
  type CvSourceFile,
} from "../cv-generation/cv-text-extraction";

/** Below this there is nothing to compare, whatever the file claimed to be. */
const MIN_CV_CHARS = 120;
/** Enough for a real offer; a job title alone makes a meaningless comparison. */
export const MIN_OFFER_CHARS = 200;
/** Same cap as the lead intent that carries the offer to the app. */
export const MAX_OFFER_CHARS = 8_000;

export const OFFER_REQUIRED_MESSAGE =
  "Collez le texte complet de l'offre (200 caracteres minimum).";
export const OFFER_NOT_USABLE_MESSAGE =
  "Cette offre ne contient aucun terme exploitable pour la comparaison.";
export const CV_NOT_ENOUGH_TEXT_MESSAGE =
  "Ce CV ne contient pas assez de texte exploitable pour etre compare.";

/** The pasted offer, trimmed and bounded, or a 400 the visitor can act on. */
export function acceptedOfferText(value: unknown): string {
  const text = typeof value === "string" ? value.trim() : "";

  if (text.length < MIN_OFFER_CHARS) {
    throw new BadRequestException(
      publicError("OFFER_TEXT_REQUIRED", OFFER_REQUIRED_MESSAGE),
    );
  }

  return text.slice(0, MAX_OFFER_CHARS);
}

/**
 * The free CV ↔ offer comparator (US-136).
 *
 * Deliberately holds no store and no model client: it cannot persist the CV
 * nor spend a model call, by construction rather than by care. The CV text
 * lives for the duration of the request.
 */
@Injectable()
export class KeywordMatchService {
  async match(request: {
    file: CvSourceFile | undefined;
    offerText: unknown;
  }): Promise<PublicKeywordMatchResponse> {
    assertScannableFile(request.file);
    const offerText = acceptedOfferText(request.offerText);

    // OCR stays off, as on the ATS scan: seconds of CPU on the API process
    // with no queue behind it. A scanned PDF simply has too little text.
    const extraction = await extractCvText(request.file, { allowOcr: false });

    if (extraction.text.length < MIN_CV_CHARS) {
      throw new UnprocessableEntityException(
        publicError("CV_NOT_ENOUGH_TEXT", CV_NOT_ENOUGH_TEXT_MESSAGE),
      );
    }

    const result = matchOfferKeywords(extraction.text, offerText);

    if (!result) {
      throw new UnprocessableEntityException(
        publicError("OFFER_NOT_USABLE", OFFER_NOT_USABLE_MESSAGE),
      );
    }

    return result;
  }
}
