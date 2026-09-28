import { APPLICATION_SOURCE_SPONTANEOUS } from "@cvforge/types";
import type { OpenRouterService } from "../ai/openrouter.service";
import type { StoredApplication } from "../applications/applications.types";
import { structureOffer } from "../applications/offer-structuring";

/**
 * An offer structured before keywords were extracted gets them now, once: the
 * generation calls a model anyway, while the score recomputed on every save
 * must stay free. Only `keywords` is taken from the new structuring, so fields
 * the candidate corrected by hand are kept.
 *
 * Never the reason a generation fails: without keywords, the score falls back
 * to the offer's sentences.
 */
export async function withOfferKeywords(
  openRouterService: Pick<OpenRouterService, "chat">,
  application: StoredApplication,
): Promise<StoredApplication> {
  if (
    application.extracted.keywords !== undefined ||
    application.sourceType === APPLICATION_SOURCE_SPONTANEOUS ||
    !application.rawOfferText.trim()
  ) {
    return application;
  }

  try {
    const { keywords } = await structureOffer(
      openRouterService,
      application.rawOfferText,
      { description: null, siteName: null, title: application.extracted.title },
      application.offerUrl,
      application.sourceType,
    );

    return { ...application, extracted: { ...application.extracted, keywords } };
  } catch (error: unknown) {
    console.error("[cv-generation] offer keyword extraction failed", error);

    return application;
  }
}
