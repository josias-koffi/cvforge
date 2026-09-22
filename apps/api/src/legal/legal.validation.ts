import {
  isLegalDocumentSlug,
  type LegalDocumentInput,
  type LegalDocumentSlug,
  type LocalizedText,
} from "@cvforge/types";
import { BadRequestException } from "@nestjs/common";

const MAX_TITLE_LENGTH = 160;
const MAX_BODY_LENGTH = 60_000;

function fail(message: string): never {
  throw new BadRequestException(message);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * A legal document is only useful published in both languages: a French update
 * that left the English behind would put two different contracts online.
 */
function readLocalized(
  value: unknown,
  label: string,
  maxLength: number,
): LocalizedText {
  const record = asRecord(value);

  const read = (raw: unknown, locale: string) => {
    const text = typeof raw === "string" ? raw.trim() : "";

    if (!text) {
      fail(`${label} (${locale}) est obligatoire.`);
    }

    if (text.length > maxLength) {
      fail(`${label} (${locale}) ne doit pas depasser ${maxLength} caracteres.`);
    }

    return text;
  };

  return { en: read(record.en, "EN"), fr: read(record.fr, "FR") };
}

export function parseLegalDocumentSlug(value: unknown): LegalDocumentSlug {
  if (!isLegalDocumentSlug(value)) {
    fail("Document legal inconnu.");
  }

  return value;
}

export function parseLegalDocumentInput(body: unknown): LegalDocumentInput {
  const record = asRecord(body);

  return {
    body: readLocalized(record.body, "Le contenu", MAX_BODY_LENGTH),
    title: readLocalized(record.title, "Le titre", MAX_TITLE_LENGTH),
  };
}
