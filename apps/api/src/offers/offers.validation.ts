import {
  CREDIT_OFFER_MIN_PRICE_CENTS,
  creditOfferStatuses,
  type CreditOfferInput,
  type CreditOfferStatus,
  type LocalizedList,
  type LocalizedText,
} from "@cvforge/types";
import { BadRequestException } from "@nestjs/common";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_TEXT_LENGTH = 280;
const MAX_FEATURES = 12;

type RawBody = Record<string, unknown>;

function fail(message: string): never {
  throw new BadRequestException(message);
}

function asRecord(value: unknown): RawBody {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as RawBody)
    : {};
}

function readText(value: unknown, label: string, required: boolean): string {
  const text = typeof value === "string" ? value.trim() : "";

  if (required && !text) {
    fail(`${label} est obligatoire.`);
  }

  if (text.length > MAX_TEXT_LENGTH) {
    fail(`${label} ne doit pas depasser ${MAX_TEXT_LENGTH} caracteres.`);
  }

  return text;
}

function readLocalizedText(value: unknown, label: string, required: boolean): LocalizedText {
  const record = asRecord(value);

  return {
    en: readText(record.en, `${label} (EN)`, required),
    fr: readText(record.fr, `${label} (FR)`, required),
  };
}

function readList(value: unknown, label: string): string[] {
  const items = (Array.isArray(value) ? value : [])
    .map((item) => readText(item, label, false))
    .filter(Boolean);

  if (items.length > MAX_FEATURES) {
    fail(`${label} : ${MAX_FEATURES} lignes maximum.`);
  }

  return items;
}

function readInteger(value: unknown, label: string, min: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min) {
    fail(`${label} doit etre un entier superieur ou egal a ${min}.`);
  }

  return value;
}

function readStatus(value: unknown): CreditOfferStatus {
  if (!(creditOfferStatuses as readonly unknown[]).includes(value)) {
    fail("Le statut de l'offre est invalide.");
  }

  return value as CreditOfferStatus;
}

/** Validates an admin payload for creating or fully replacing an offer. */
export function parseCreditOfferInput(body: unknown): CreditOfferInput {
  const record = asRecord(body);
  const slug = readText(record.slug, "L'identifiant", true).toLowerCase();

  if (!SLUG_PATTERN.test(slug)) {
    fail("L'identifiant ne peut contenir que des minuscules, chiffres et tirets.");
  }

  const features = asRecord(record.features);

  return {
    credits: readInteger(record.credits, "Le nombre de credits", 1),
    description: readLocalizedText(record.description, "La description", false),
    features: {
      en: readList(features.en, "Les fonctionnalites (EN)"),
      fr: readList(features.fr, "Les fonctionnalites (FR)"),
    } satisfies LocalizedList,
    name: readLocalizedText(record.name, "Le nom", true),
    priceCents: readInteger(record.priceCents, "Le prix", CREDIT_OFFER_MIN_PRICE_CENTS),
    slug,
    sortOrder: readInteger(record.sortOrder ?? 0, "L'ordre", 0),
    status: readStatus(record.status),
  };
}
