import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  UnprocessableEntityException,
} from "@nestjs/common";
import {
  APPLICATION_STATUS_DRAFT,
  type DraftApplication,
  type ExtractedOfferFields,
} from "@cvforge/types";
import { randomUUID } from "node:crypto";
import type { OpenRouterService } from "../ai/openrouter.service";
import type {
  ApplicationsStore,
  OfferExtractionResult,
  StoredApplication,
} from "./applications.types";
import {
  buildOfferPreview,
  extractOfferMetadata,
  extractVisibleTextFromHtml,
  inferLocaleFromText,
} from "./offer-extraction";

type ExtractedOfferPayload = Omit<ExtractedOfferFields, "language"> & {
  language?: string | null;
};

const MIN_OFFER_TEXT_LENGTH = 160;

function normalizeOfferUrl(rawUrl: string) {
  const value = rawUrl.trim();

  if (!value) {
    throw new BadRequestException("Une URL d'offre est requise.");
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new BadRequestException("L'URL de l'offre est invalide.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new BadRequestException("Seules les URL http et https sont acceptees.");
  }

  return url.toString();
}

function extractFirstJsonObject(rawContent: string) {
  const fencedMatch = rawContent.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1] ?? rawContent;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new UnprocessableEntityException(
      "Le service d'extraction n'a pas retourne un JSON exploitable.",
    );
  }

  try {
    return JSON.parse(candidate.slice(start, end + 1)) as ExtractedOfferPayload;
  } catch {
    throw new UnprocessableEntityException(
      "Le service d'extraction a retourne un JSON invalide.",
    );
  }
}

function toStringOrNull(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized.length > 0 ? normalized : null;
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0)
    .slice(0, 8);
}

function normalizeExtractedFields(
  payload: ExtractedOfferPayload,
  fallback: {
    description: string | null;
    offerText: string;
    siteName: string | null;
    title: string | null;
  },
): ExtractedOfferFields {
  const title = toStringOrNull(payload.title) ?? fallback.title;
  const summary =
    toStringOrNull(payload.summary) ??
    fallback.description ??
    buildOfferPreview(fallback.offerText, 320);

  if (!title || !summary) {
    throw new UnprocessableEntityException(
      "L'offre a ete recuperee mais ses informations utiles n'ont pas pu etre extraites.",
    );
  }

  return {
    companyName: toStringOrNull(payload.companyName) ?? fallback.siteName,
    contractType: toStringOrNull(payload.contractType),
    language:
      payload.language === "en" || payload.language === "fr"
        ? payload.language
        : inferLocaleFromText(fallback.offerText),
    location: toStringOrNull(payload.location),
    requirements: toStringArray(payload.requirements),
    responsibilities: toStringArray(payload.responsibilities),
    salaryRange: toStringOrNull(payload.salaryRange),
    summary,
    title,
  };
}

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly store: ApplicationsStore,
    private readonly openRouterService: OpenRouterService,
  ) {}

  listApplications(userEmail: string): DraftApplication[] {
    return this.store.listByUserEmail(userEmail).map(stripRawOfferText);
  }

  async importFromUrl(
    userEmail: string,
    rawUrl: string,
  ): Promise<DraftApplication> {
    const extraction = await this.extractOffer(rawUrl);
    const timestamp = new Date().toISOString();
    const storedApplication: StoredApplication = {
      createdAt: timestamp,
      id: randomUUID(),
      offerTextPreview: extraction.offerTextPreview,
      offerUrl: extraction.offerUrl,
      rawOfferText: extraction.offerText,
      status: APPLICATION_STATUS_DRAFT,
      updatedAt: timestamp,
      userEmail,
      extracted: extraction.extracted,
    };

    return stripRawOfferText(this.store.createDraft(storedApplication));
  }

  private async extractOffer(rawUrl: string): Promise<OfferExtractionResult> {
    const offerUrl = normalizeOfferUrl(rawUrl);
    const html = await this.fetchOfferHtml(offerUrl);
    const offerText = extractVisibleTextFromHtml(html);

    if (offerText.length < MIN_OFFER_TEXT_LENGTH) {
      throw new UnprocessableEntityException(
        "Le scraping a reussi mais le contenu recupere est insuffisant pour creer une candidature.",
      );
    }

    const metadata = extractOfferMetadata(html);
    const extracted = await this.extractStructuredFields(offerUrl, offerText, metadata);

    return {
      extracted,
      offerText,
      offerTextPreview: buildOfferPreview(offerText),
      offerUrl,
    };
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

  private async extractStructuredFields(
    offerUrl: string,
    offerText: string,
    metadata: {
      description: string | null;
      siteName: string | null;
      title: string | null;
    },
  ) {
    const response = await this.openRouterService.chat(
      [
        {
          role: "system",
          content:
            "You extract structured job-offer data. Return JSON only with keys: title, companyName, location, contractType, salaryRange, summary, responsibilities, requirements, language.",
        },
        {
          role: "user",
          content: JSON.stringify({
            description: metadata.description,
            offerText,
            offerUrl,
            siteName: metadata.siteName,
            titleHint: metadata.title,
          }),
        },
      ],
      { temperature: 0 },
    );

    const payload = extractFirstJsonObject(response);

    return normalizeExtractedFields(payload, {
      description: metadata.description,
      offerText,
      siteName: metadata.siteName,
      title: metadata.title,
    });
  }
}

function stripRawOfferText(application: StoredApplication): DraftApplication {
  const { rawOfferText: _rawOfferText, ...draftApplication } = application;

  return draftApplication;
}
