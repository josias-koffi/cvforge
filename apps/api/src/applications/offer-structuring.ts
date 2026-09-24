import { UnprocessableEntityException } from "@nestjs/common";
import type { DraftApplication, ExtractedOfferFields } from "@cvforge/types";
import { withOpenRouterHttpErrors } from "../ai/openrouter.exception";
import type { OpenRouterService } from "../ai/openrouter.service";
import { buildOfferPreview, inferLocaleFromText } from "./offer-extraction";

/**
 * An offer's text turned into the fields an application shows: one model call
 * and the parsing of what it answers. Out of `ApplicationsService` so a caller
 * that does not bill the user (a free tool's lead, US-136) can use it too.
 */

type ExtractedOfferPayload = Omit<ExtractedOfferFields, "language"> & {
  language?: string | null;
};

export type OfferMetadata = {
  description: string | null;
  siteName: string | null;
  title: string | null;
};

const MAX_EXTRACTED_LIST_ITEMS = 8;

export async function structureOffer(
  openRouterService: Pick<OpenRouterService, "chat">,
  offerText: string,
  metadata: OfferMetadata,
  offerUrl: string | null,
  sourceType: DraftApplication["sourceType"],
) {
  const response = await withOpenRouterHttpErrors(() =>
    openRouterService.chat(
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
            sourceType,
            siteName: metadata.siteName,
            titleHint: metadata.title,
          }),
        },
      ],
      { temperature: 0 },
    ),
  );

  const payload = extractFirstJsonObject(response);

  return normalizeExtractedFields(payload, { ...metadata, offerText });
}

/**
 * The fields read from the text alone, with no model: a title from the
 * offer's first line and a summary from its opening. What an application
 * falls back to when structuring it is not possible.
 */
export function unstructuredOffer(offerText: string) {
  const firstLine = offerText.split("\n").find((line) => line.trim()) ?? "";

  return normalizeExtractedFields({} as ExtractedOfferPayload, {
    description: null,
    offerText,
    siteName: null,
    title: buildOfferPreview(firstLine, 80) || buildOfferPreview(offerText, 80),
  });
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

export function toStringOrNull(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized.length > 0 ? normalized : null;
}

export function toStringArray(
  value: unknown,
  limit = MAX_EXTRACTED_LIST_ITEMS,
) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0)
    .slice(0, limit);
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
