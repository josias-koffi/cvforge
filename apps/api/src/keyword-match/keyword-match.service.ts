import { matchOfferKeywords } from "@cvforge/ats-score";
import { publicError, type PublicKeywordMatchResponse } from "@cvforge/types";
import { Injectable, UnprocessableEntityException } from "@nestjs/common";
import { acceptedOfferText, assertScannableFile } from "../ats/ats.validation";
import {
  extractCvText,
  type CvSourceFile,
} from "../cv-generation/cv-text-extraction";

/** Below this there is nothing to compare, whatever the file claimed to be. */
const MIN_CV_CHARS = 120;

export const OFFER_NOT_USABLE_MESSAGE =
  "Cette offre ne contient aucun terme exploitable pour la comparaison.";
export const CV_NOT_ENOUGH_TEXT_MESSAGE =
  "Ce CV ne contient pas assez de texte exploitable pour etre compare.";

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
