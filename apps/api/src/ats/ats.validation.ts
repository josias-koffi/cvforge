import { publicError } from "@cvforge/types";
import { BadRequestException } from "@nestjs/common";
import type { CvSourceFile } from "../cv-generation/cv-text-extraction";

export const MAX_SCAN_BYTES = 5 * 1024 * 1024;

/** "%PDF-" — every PDF opens on it. */
const PDF_MAGIC = Buffer.from("25504446", "hex");
/** "PK\x03\x04" — a DOCX is a ZIP container. */
const ZIP_MAGIC = Buffer.from("504b0304", "hex");

export const UNSUPPORTED_FILE_MESSAGE =
  "Seuls les fichiers PDF et DOCX sont acceptes.";
export const FILE_TOO_LARGE_MESSAGE = "Le fichier CV doit peser moins de 5 Mo.";

/**
 * Validates an upload arriving on a public, unauthenticated route.
 *
 * The declared `mimetype` comes from the client and is worth nothing here: it
 * is trivially set to `application/pdf` on anything at all. The first bytes are
 * the only claim the file makes about itself that the sender does not control,
 * so they are what decides.
 */
export function assertScannableFile(
  file: CvSourceFile | undefined,
): asserts file is CvSourceFile {
  if (!file) {
    throw new BadRequestException(
      publicError("CV_FILE_REQUIRED", "Un fichier CV est requis."),
    );
  }

  if (file.size > MAX_SCAN_BYTES || file.buffer.length > MAX_SCAN_BYTES) {
    throw new BadRequestException(
      publicError("CV_FILE_TOO_LARGE", FILE_TOO_LARGE_MESSAGE),
    );
  }

  if (
    !startsWith(file.buffer, PDF_MAGIC) &&
    !startsWith(file.buffer, ZIP_MAGIC)
  ) {
    throw new BadRequestException(
      publicError("CV_FILE_UNSUPPORTED", UNSUPPORTED_FILE_MESSAGE),
    );
  }
}

function startsWith(buffer: Buffer, magic: Buffer) {
  return (
    buffer.length >= magic.length &&
    buffer.subarray(0, magic.length).equals(magic)
  );
}

/** A pasted job offer, bounded: it is forwarded to a model. */
export const MAX_OFFER_CHARS = 8_000;

export function readOfferText(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed.slice(0, MAX_OFFER_CHARS) : null;
}

/** Enough for a real offer; a job title alone gives nothing to work from. */
export const MIN_OFFER_CHARS = 200;

export const OFFER_REQUIRED_MESSAGE =
  "Collez le texte complet de l'offre (200 caracteres minimum).";

/**
 * The offer a free tool requires (US-136, US-141), trimmed and bounded, or a
 * 400 the visitor can act on. The ATS scan's offer is optional, hence
 * `readOfferText` above.
 */
export function acceptedOfferText(value: unknown): string {
  const text = readOfferText(value) ?? "";

  if (text.length < MIN_OFFER_CHARS) {
    throw new BadRequestException(
      publicError("OFFER_TEXT_REQUIRED", OFFER_REQUIRED_MESSAGE),
    );
  }

  return text;
}
