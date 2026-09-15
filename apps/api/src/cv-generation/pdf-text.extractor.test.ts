import { deflateSync } from "node:zlib";
import { UnprocessableEntityException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { extractPdfText, renderPdfPages } from "./pdf-text.extractor";

/** Minimal single-page PDF whose content stream is Flate-compressed, like real-world exports. */
function buildCompressedPdf(text: string) {
  const content = deflateSync(Buffer.from(`BT /F1 12 Tf 72 720 Td (${text}) Tj ET`, "latin1"));
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    null,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  const chunks: Buffer[] = [Buffer.from("%PDF-1.4\n", "latin1")];
  const offsets: number[] = [];
  let length = chunks[0].length;
  const push = (chunk: Buffer) => {
    chunks.push(chunk);
    length += chunk.length;
  };

  objects.forEach((body, index) => {
    offsets.push(length);
    if (body === null) {
      push(Buffer.from(`${index + 1} 0 obj\n<< /Length ${content.length} /Filter /FlateDecode >>\nstream\n`, "latin1"));
      push(content);
      push(Buffer.from("\nendstream\nendobj\n", "latin1"));
    } else {
      push(Buffer.from(`${index + 1} 0 obj\n${body}\nendobj\n`, "latin1"));
    }
  });

  const xref = [
    `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`,
    ...offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`),
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${length}\n%%EOF\n`,
  ].join("");
  push(Buffer.from(xref, "latin1"));

  return Buffer.concat(chunks);
}

describe("extractPdfText", () => {
  it("reads the text layer of a compressed PDF", async () => {
    const text = await extractPdfText(buildCompressedPdf("Senior Product Engineer chez Acme"));

    expect(text).toContain("Senior Product Engineer chez Acme");
  });

  it("rejects buffers that are not PDFs", async () => {
    await expect(extractPdfText(Buffer.from("not a pdf"))).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it("rasterises pages to PNG for OCR, up to the page cap", async () => {
    const images = await renderPdfPages(buildCompressedPdf("Scanned page"), 4);

    expect(images).toHaveLength(1);
    expect(images[0].subarray(1, 4).toString("latin1")).toBe("PNG");
  });
});
