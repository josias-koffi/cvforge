import {
  BadRequestException,
  UnprocessableEntityException,
} from "@nestjs/common";
import {
  APPLICATION_SOURCE_TEXT,
  APPLICATION_SOURCE_URL,
  type ExtractedOfferFields,
} from "@cvforge/types";
import { toStringArray, toStringOrNull } from "./offer-structuring";

// What a candidate types or pastes to create or edit an application, checked
// before anything is fetched, structured or stored.

export const MIN_OFFER_TEXT_LENGTH = 160;
const MAX_OFFER_TEXT_LENGTH = 50_000;
const MAX_EDITED_LIST_ITEMS = 30;
export const MANUAL_TEXT_SOURCE_LABEL = "Texte colle manuellement";

type NullableOfferField =
  | "companyName"
  | "contractType"
  | "location"
  | "salaryRange";

export function normalizeOfferUrl(rawUrl: string) {
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
    throw new BadRequestException(
      "Seules les URL http et https sont acceptees.",
    );
  }

  return url.toString();
}

export function normalizeOfferText(rawText: string) {
  const value = rawText.trim();

  if (!value) {
    throw new BadRequestException("Le texte de l'offre est requis.");
  }

  if (value.length < MIN_OFFER_TEXT_LENGTH) {
    throw new UnprocessableEntityException(
      "Le texte fourni est insuffisant pour creer une candidature.",
    );
  }

  return value;
}

export function normalizeEditedOfferText(rawText: string) {
  const value = rawText.trim();

  if (!value) {
    throw new BadRequestException("Le descriptif de l'offre est requis.");
  }

  if (value.length > MAX_OFFER_TEXT_LENGTH) {
    throw new BadRequestException("Le descriptif de l'offre est trop long.");
  }

  return value;
}

export function describeSource(offerUrl: string | null) {
  return offerUrl
    ? { offerUrl, sourceLabel: offerUrl, sourceType: APPLICATION_SOURCE_URL }
    : {
        offerUrl: null,
        sourceLabel: MANUAL_TEXT_SOURCE_LABEL,
        sourceType: APPLICATION_SOURCE_TEXT,
      };
}

export function mergeExtractedFields(
  current: ExtractedOfferFields,
  patch: Partial<ExtractedOfferFields>,
): ExtractedOfferFields {
  const title =
    patch.title === undefined ? current.title : toStringOrNull(patch.title);

  if (!title) {
    throw new BadRequestException("L'intitule du poste est requis.");
  }

  const pickNullable = (key: NullableOfferField) =>
    patch[key] === undefined ? current[key] : toStringOrNull(patch[key]);
  const pickList = (key: "requirements" | "responsibilities") =>
    patch[key] === undefined
      ? current[key]
      : toStringArray(patch[key], MAX_EDITED_LIST_ITEMS);

  return {
    companyName: pickNullable("companyName"),
    contractType: pickNullable("contractType"),
    language:
      patch.language === "en" || patch.language === "fr"
        ? patch.language
        : current.language,
    location: pickNullable("location"),
    requirements: pickList("requirements"),
    responsibilities: pickList("responsibilities"),
    salaryRange: pickNullable("salaryRange"),
    summary:
      patch.summary === undefined
        ? current.summary
        : (toStringOrNull(patch.summary) ?? ""),
    title,
  };
}
