import { deflateSync } from "node:zlib";
import type { CvSourceFile } from "../../cv-generation/cv-text-extraction";

/**
 * Test helpers for the public routes that take a CV upload: the ATS scan and
 * the CV ↔ offer comparator (US-136).
 */

/** A single-page PDF carrying a real text layer, as a real upload would. */
export function buildPdf(text: string) {
  const lines = text.split("\n");
  const stream = lines
    .map(
      (line, index) =>
        `BT /F1 11 Tf 72 ${740 - index * 16} Td (${line.replace(/[()\\]/g, "")}) Tj ET`,
    )
    .join("\n");
  const content = deflateSync(Buffer.from(stream, "latin1"));
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    null,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  const chunks: Buffer[] = [Buffer.from("%PDF-1.4\n", "latin1")];
  const offsets: number[] = [];
  let length = chunks[0]!.length;
  const push = (chunk: Buffer) => {
    chunks.push(chunk);
    length += chunk.length;
  };

  objects.forEach((body, index) => {
    offsets.push(length);
    if (body === null) {
      push(
        Buffer.from(
          `${index + 1} 0 obj\n<< /Length ${content.length} /Filter /FlateDecode >>\nstream\n`,
          "latin1",
        ),
      );
      push(content);
      push(Buffer.from("\nendstream\nendobj\n", "latin1"));
    } else {
      push(Buffer.from(`${index + 1} 0 obj\n${body}\nendobj\n`, "latin1"));
    }
  });

  push(
    Buffer.from(
      [
        `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`,
        ...offsets.map(
          (offset) => `${String(offset).padStart(10, "0")} 00000 n \n`,
        ),
        `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${length}\n%%EOF\n`,
      ].join(""),
      "latin1",
    ),
  );

  return Buffer.concat(chunks);
}

/** The upload as Multer hands it to a controller. */
export function pdfFile(buffer: Buffer): CvSourceFile {
  return {
    buffer,
    mimetype: "application/pdf",
    originalname: "cv.pdf",
    size: buffer.length,
  };
}
