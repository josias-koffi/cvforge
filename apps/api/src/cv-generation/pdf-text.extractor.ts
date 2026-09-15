import { UnprocessableEntityException } from "@nestjs/common";

type PdfTextItem = { hasEOL?: boolean; str?: string };
type PdfjsModule = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

const PDFJS_SPECIFIER = "pdfjs-dist/legacy/build/pdf.mjs";
const MAX_PDF_PAGES = 50;

// pdfjs-dist ships ESM only; a Function-wrapped import stops tsc (commonjs) from rewriting it to require().
// VM-based runners (vitest) reject that native import, where the transpiled import() works instead.
async function loadPdfjs(): Promise<PdfjsModule> {
  try {
    return await (new Function("specifier", "return import(specifier)")(PDFJS_SPECIFIER) as Promise<PdfjsModule>);
  } catch {
    return import(PDFJS_SPECIFIER);
  }
}

/** Reads the text layer of a PDF (ADR-006). Scanned PDFs without a text layer yield an empty string. */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const { getDocument } = await loadPdfjs();
  const data = new Uint8Array(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));

  let document;
  try {
    document = await getDocument({ data, isEvalSupported: false, useSystemFonts: false }).promise;
  } catch {
    throw new UnprocessableEntityException("Le fichier PDF est illisible ou corrompu.");
  }

  try {
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= Math.min(document.numPages, MAX_PDF_PAGES); pageNumber++) {
      const page = await document.getPage(pageNumber);
      const { items } = await page.getTextContent();
      pages.push(
        (items as PdfTextItem[]).map((item) => `${item.str ?? ""}${item.hasEOL ? "\n" : ""}`).join(""),
      );
    }

    return pages.join("\n").trim();
  } finally {
    await document.destroy();
  }
}
