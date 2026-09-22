import { BadRequestException } from "@nestjs/common";
import mammoth from "mammoth";
import { recognizeImages } from "./ocr.extractor";
import type { PdfTextExtraction } from "./pdf-signals";
import { extractPdfContent, renderPdfPages } from "./pdf-text.extractor";

export type CvSourceFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

/**
 * How the text was obtained — the single most telling ATS signal there is.
 *
 * `pdf-ocr` means the file carried no text layer: a real ATS reads such a CV as
 * a blank page, whatever it looks like to a human.
 */
export type CvExtractionKind = "pdf-text" | "pdf-ocr" | "docx";

export type ExtractedCvText = {
  text: string;
  kind: CvExtractionKind;
  /** Layout signals; absent for DOCX, which has no page geometry to inspect. */
  signals?: PdfTextExtraction;
};

export const MIN_EXTRACTED_TEXT_LENGTH = 120;
/** A CV rarely exceeds a few pages; the cap bounds OCR time (a few seconds per page). */
export const MAX_OCR_PAGES = 4;

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * Reads a CV into text, whatever it arrived as.
 *
 * `allowOcr` is the lever the public landing scan pulls: OCR costs seconds of
 * CPU on the API process, with no job queue behind it, so an unauthenticated
 * route reads the text layer or nothing at all.
 */
export async function extractCvText(
  file: CvSourceFile,
  { allowOcr = true }: { allowOcr?: boolean } = {},
): Promise<ExtractedCvText> {
  const filename = file.originalname.toLowerCase();

  if (file.mimetype === DOCX_MIME || filename.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer: file.buffer });

    return { kind: "docx", text: result.value.trim() };
  }

  if (file.mimetype === "application/pdf" || filename.endsWith(".pdf")) {
    return extractFromPdf(file.buffer, allowOcr);
  }

  throw new BadRequestException("Seuls les fichiers PDF et DOCX sont acceptes.");
}

async function extractFromPdf(
  buffer: Buffer,
  allowOcr: boolean,
): Promise<ExtractedCvText> {
  const signals = await extractPdfContent(buffer);

  // `kind` says where the returned text came from, nothing more. With OCR
  // refused, a scanned file still returns its (empty) text layer — and
  // `signals.hasTextLayer` is what tells the score the page was an image.
  if (signals.text.length >= MIN_EXTRACTED_TEXT_LENGTH || !allowOcr) {
    return { kind: "pdf-text", signals, text: signals.text };
  }

  const text = await recognizeImages(await renderPdfPages(buffer, MAX_OCR_PAGES));

  // The signals still describe the file, not the OCR output: `hasTextLayer`
  // stays false, which is exactly what the score must know.
  return { kind: "pdf-ocr", signals, text };
}
