import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import type { CvSourceFile } from "../cv-generation/cv-text-extraction";
import {
  assertScannableFile,
  MAX_OFFER_CHARS,
  MAX_SCAN_BYTES,
  readOfferText,
} from "./ats.validation";

function makeFile(
  buffer: Buffer,
  overrides: Partial<CvSourceFile> = {},
): CvSourceFile {
  return {
    buffer,
    mimetype: "application/pdf",
    originalname: "cv.pdf",
    size: buffer.length,
    ...overrides,
  };
}

const PDF = Buffer.from("%PDF-1.4\nrest of the file");
const DOCX = Buffer.concat([
  Buffer.from("504b0304", "hex"),
  Buffer.from("zip payload"),
]);

describe("assertScannableFile", () => {
  /** The landing translates the code; the French message is never shown (US-134). */
  it.each([
    ["a missing file", undefined, "CV_FILE_REQUIRED"],
    [
      "an oversized file",
      makeFile(PDF, { size: MAX_SCAN_BYTES + 1 }),
      "CV_FILE_TOO_LARGE",
    ],
    [
      "a file that is neither PDF nor DOCX",
      makeFile(Buffer.from("GIF89a")),
      "CV_FILE_UNSUPPORTED",
    ],
  ])("names %s with a code", (_label, file, code) => {
    let caught: unknown;

    try {
      assertScannableFile(file);
    } catch (error) {
      caught = error;
    }

    expect((caught as BadRequestException).getResponse()).toMatchObject({
      code,
    });
  });

  it("accepts a PDF", () => {
    expect(() => assertScannableFile(makeFile(PDF))).not.toThrow();
  });

  it("accepts a DOCX, which is a ZIP container", () => {
    expect(() =>
      assertScannableFile(
        makeFile(DOCX, {
          mimetype:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          originalname: "cv.docx",
        }),
      ),
    ).not.toThrow();
  });

  it("requires a file at all", () => {
    expect(() => assertScannableFile(undefined)).toThrow(BadRequestException);
  });

  /**
   * On a public route the declared mimetype is worth nothing: it is trivially
   * set to application/pdf on anything. The first bytes are the only claim the
   * sender does not control.
   */
  it("refuses a script dressed up as a PDF", () => {
    const disguised = makeFile(Buffer.from("#!/bin/sh\nrm -rf /"));

    expect(() => assertScannableFile(disguised)).toThrow(BadRequestException);
  });

  it("refuses a file whose bytes are shorter than any signature", () => {
    expect(() => assertScannableFile(makeFile(Buffer.from("%P")))).toThrow(
      BadRequestException,
    );
  });

  it("refuses an empty file", () => {
    expect(() => assertScannableFile(makeFile(Buffer.alloc(0)))).toThrow(
      BadRequestException,
    );
  });

  it("refuses a file over the size cap", () => {
    expect(() =>
      assertScannableFile(makeFile(PDF, { size: MAX_SCAN_BYTES + 1 })),
    ).toThrow(BadRequestException);
  });

  /** A lying `size` must not get a huge buffer past the cap. */
  it("measures the bytes it received, not the size it was told", () => {
    const oversized = makeFile(
      Buffer.concat([PDF, Buffer.alloc(MAX_SCAN_BYTES)]),
      { size: 10 },
    );

    expect(() => assertScannableFile(oversized)).toThrow(BadRequestException);
  });
});

describe("readOfferText", () => {
  it("keeps a pasted offer", () => {
    expect(readOfferText("  Ingénieur plateforme  ")).toBe(
      "Ingénieur plateforme",
    );
  });

  it("treats blank input as no offer", () => {
    expect(readOfferText("   ")).toBeNull();
    expect(readOfferText("")).toBeNull();
  });

  it("treats a non-string as no offer", () => {
    expect(readOfferText(undefined)).toBeNull();
    expect(readOfferText(42)).toBeNull();
    expect(readOfferText({ offer: "x" })).toBeNull();
  });

  /** It is forwarded to a model, so its length is bounded. */
  it("truncates an offer past the cap", () => {
    expect(readOfferText("a".repeat(20_000))).toHaveLength(MAX_OFFER_CHARS);
  });
});
