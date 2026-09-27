import { UnprocessableEntityException } from "@nestjs/common";
import {
  columnSuspicion,
  mojibakeRatio,
  type PdfTextExtraction,
  type PositionedTextItem,
} from "./pdf-signals";

type PdfTextItem = PositionedTextItem & { hasEOL?: boolean };
type PdfjsModule = typeof import("pdfjs-dist/legacy/build/pdf.mjs");
type PdfDocument = Awaited<ReturnType<PdfjsModule["getDocument"]>["promise"]>;
type RenderedCanvas = { canvas: { toBuffer(mime: "image/png"): Buffer }; context: unknown };

const PDFJS_SPECIFIER = "pdfjs-dist/legacy/build/pdf.mjs";
const MAX_PDF_PAGES = 50;
// 2x the PDF user space (~144 dpi) keeps body text legible for OCR without huge bitmaps.
const RENDER_SCALE = 2;

// pdfjs-dist ships ESM only; a Function-wrapped import stops tsc (commonjs) from rewriting it to require().
// VM-based runners (vitest) reject that native import, where the transpiled import() works instead.
async function loadPdfjs(): Promise<PdfjsModule> {
  try {
    return await (new Function("specifier", "return import(specifier)")(PDFJS_SPECIFIER) as Promise<PdfjsModule>);
  } catch {
    return import(PDFJS_SPECIFIER);
  }
}

async function withPdfDocument<T>(
  buffer: Buffer,
  maxPages: number,
  readPage: (document: PdfDocument, pageNumber: number) => Promise<T>,
): Promise<{ pageCount: number; results: T[] }> {
  const { getDocument } = await loadPdfjs();
  const data = new Uint8Array(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));

  let document: PdfDocument;
  try {
    document = await getDocument({ data, isEvalSupported: false, useSystemFonts: false }).promise;
  } catch {
    throw new UnprocessableEntityException("Le fichier PDF est illisible ou corrompu.");
  }

  try {
    const results: T[] = [];
    for (let pageNumber = 1; pageNumber <= Math.min(document.numPages, maxPages); pageNumber++) {
      results.push(await readPage(document, pageNumber));
    }

    // The real count, not the capped one: "too many pages" is itself a finding.
    return { pageCount: document.numPages, results };
  } finally {
    await document.destroy();
  }
}

/**
 * Reads the text layer of a PDF (ADR-006) along with the layout signals the ATS
 * score needs (ADR-021). Scanned PDFs without a text layer yield an empty
 * string and `hasTextLayer: false`.
 *
 * Signals are gathered in the same pass as the text: re-opening the document to
 * measure it would double the parse cost of every public scan.
 */
export async function extractPdfContent(buffer: Buffer): Promise<PdfTextExtraction> {
  const { pageCount, results } = await withPdfDocument(buffer, MAX_PDF_PAGES, async (document, pageNumber) => {
    const page = await document.getPage(pageNumber);
    const { items } = await page.getTextContent();
    const textItems = items as PdfTextItem[];

    return {
      items: textItems,
      text: textItems.map((item) => `${item.str ?? ""}${item.hasEOL ? "\n" : ""}`).join(""),
      width: page.getViewport({ scale: 1 }).width,
    };
  });

  const text = results.map((page) => page.text).join("\n").trim();
  const items = results.flatMap((page) => page.items);

  return {
    columnSuspicion: averageColumnSuspicion(results),
    // Items rather than the trimmed text: a page of whitespace still proves a
    // text layer was present, and a scanned page yields no items at all.
    hasTextLayer: items.some((item) => (item.str ?? "").trim().length > 0),
    mojibakeRatio: mojibakeRatio(text),
    pageCount,
    text,
  };
}

/** Per page, then averaged: pages differ in width, and a ratio cannot be pooled across them. */
function averageColumnSuspicion(
  pages: Array<{ items: PdfTextItem[]; width: number }>,
): number {
  if (pages.length === 0) return 0;

  const total = pages.reduce(
    (sum, page) => sum + columnSuspicion(page.items, page.width),
    0,
  );

  return Math.round((total / pages.length) * 100) / 100;
}

/** Rasterises the first pages of a PDF to PNG, for OCR of scanned documents (ADR-009). */
export async function renderPdfPages(buffer: Buffer, maxPages: number): Promise<Buffer[]> {
  const { results } = await withPdfDocument(buffer, maxPages, async (document, pageNumber) => {
    const page = await document.getPage(pageNumber);
    const viewport = page.getViewport({ scale: RENDER_SCALE });
    const factory = document.canvasFactory as { create(width: number, height: number): RenderedCanvas };
    const { canvas, context } = factory.create(Math.ceil(viewport.width), Math.ceil(viewport.height));

    // Canvases start transparent; OCR needs dark text on an opaque white page.
    const canvasContext = context as CanvasRenderingContext2D;
    canvasContext.fillStyle = "#ffffff";
    canvasContext.fillRect(0, 0, canvasContext.canvas.width, canvasContext.canvas.height);

    await page.render({ canvasContext, viewport }).promise;
    page.cleanup();

    return canvas.toBuffer("image/png");
  });

  return results;
}
