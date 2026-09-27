import {
  BadGatewayException,
  Logger,
  UnprocessableEntityException,
} from "@nestjs/common";
import {
  AI_CREDIT_ACTION_OFFER_ENRICHMENT,
  APPLICATION_SOURCE_TEXT,
  APPLICATION_SOURCE_URL,
  type ExtractedOfferFields,
} from "@cvforge/types";
import type { OpenRouterService } from "../ai/openrouter.service";
import type { CreditsService } from "../credits/credits.service";
import type { OfferExtractionResult } from "./applications.types";
import {
  buildOfferPreview,
  extractOfferMetadata,
  extractVisibleTextFromHtml,
} from "./offer-extraction";
import {
  MANUAL_TEXT_SOURCE_LABEL,
  MIN_OFFER_TEXT_LENGTH,
  normalizeOfferText,
  normalizeOfferUrl,
} from "./offer-input";
import { structureOffer, unstructuredOffer } from "./offer-structuring";

/**
 * Turns an offer URL or a pasted text into what an application is created
 * from: the text, its preview, and the fields the model structured out of it.
 *
 * A candidate's import is charged a credit; a free tool's lead is not.
 */
export class OfferImporter {
  private readonly logger = new Logger(OfferImporter.name);

  constructor(
    private readonly openRouterService: OpenRouterService,
    private readonly creditsService: CreditsService,
  ) {}

  async fromUrl(
    userEmail: string,
    rawUrl: string,
  ): Promise<OfferExtractionResult> {
    const offerUrl = normalizeOfferUrl(rawUrl);
    const html = await this.fetchOfferHtml(offerUrl);
    const offerText = extractVisibleTextFromHtml(html);

    if (offerText.length < MIN_OFFER_TEXT_LENGTH) {
      throw new UnprocessableEntityException(
        "Le scraping a reussi mais le contenu recupere est insuffisant pour creer une candidature.",
      );
    }

    const metadata = extractOfferMetadata(html);
    const extracted = await this.extractWithCredits(userEmail, () =>
      structureOffer(
        this.openRouterService,
        offerText,
        metadata,
        offerUrl,
        APPLICATION_SOURCE_URL,
      ),
    );

    return {
      extracted,
      offerText,
      offerTextPreview: buildOfferPreview(offerText),
      offerUrl,
      sourceLabel: offerUrl,
      sourceType: APPLICATION_SOURCE_URL,
    };
  }

  async fromText(
    userEmail: string,
    rawOfferText: string,
  ): Promise<OfferExtractionResult> {
    const offerText = normalizeOfferText(rawOfferText);
    const extracted = await this.extractWithCredits(userEmail, () =>
      this.structureText(offerText),
    );

    return textExtraction(offerText, extracted, MANUAL_TEXT_SOURCE_LABEL);
  }

  /**
   * The offer a free tool's visitor asked for by signing up (US-136, US-141):
   * on the house, so no credit is checked or spent. If the model cannot
   * structure it, the text alone is kept — the visitor was promised an
   * application, and can re-extract it later.
   */
  async offered(
    rawOfferText: string,
    sourceLabel: string,
  ): Promise<OfferExtractionResult> {
    const offerText = normalizeOfferText(rawOfferText);
    const extracted = await this.structureText(offerText).catch(
      (error: unknown) => {
        this.logger.warn(
          `Offered offer structuring failed, kept as text: ${error instanceof Error ? error.message : String(error)}`,
        );

        return unstructuredOffer(offerText);
      },
    );

    return textExtraction(offerText, extracted, sourceLabel);
  }

  private structureText(offerText: string) {
    return structureOffer(
      this.openRouterService,
      offerText,
      {
        description: buildOfferPreview(offerText, 320),
        siteName: null,
        title: null,
      },
      null,
      APPLICATION_SOURCE_TEXT,
    );
  }

  private async fetchOfferHtml(offerUrl: string) {
    let response: Response;

    try {
      response = await fetch(offerUrl, {
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent":
            "Mozilla/5.0 (compatible; CVforgeBot/1.0; +https://cvforge.app)",
        },
      });
    } catch {
      throw new BadGatewayException(
        "Impossible de recuperer cette offre depuis l'URL fournie.",
      );
    }

    if (!response.ok) {
      throw new BadGatewayException(
        "Le site cible a refuse ou interrompu la recuperation de l'offre.",
      );
    }

    const html = await response.text();

    if (!html.trim()) {
      throw new UnprocessableEntityException(
        "L'URL a repondu mais n'a fourni aucun contenu exploitable.",
      );
    }

    return html;
  }

  /**
   * Checks the balance up front so a broke user never triggers a paid call,
   * but debits only once the extraction succeeded: a throttled provider used
   * to burn the user's credits and still return an error.
   */
  private async extractWithCredits<T>(
    userEmail: string,
    extract: () => Promise<T>,
  ): Promise<T> {
    await this.creditsService.assertSufficientCredits(
      AI_CREDIT_ACTION_OFFER_ENRICHMENT,
      userEmail,
    );

    const extracted = await extract();

    await this.creditsService.consumeCredits({
      action: AI_CREDIT_ACTION_OFFER_ENRICHMENT,
      userEmail,
    });

    return extracted;
  }
}

function textExtraction(
  offerText: string,
  extracted: ExtractedOfferFields,
  sourceLabel: string,
): OfferExtractionResult {
  return {
    extracted,
    offerText,
    offerTextPreview: buildOfferPreview(offerText),
    offerUrl: null,
    sourceLabel,
    sourceType: APPLICATION_SOURCE_TEXT,
  };
}
