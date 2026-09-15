import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { recognizeImages } from "./ocr.extractor";

describe("recognizeImages", () => {
  it("reads text from a scanned image with the bundled trained data", async () => {
    const image = readFileSync(join(__dirname, "__fixtures__", "scanned-line.png"));

    await expect(recognizeImages([image])).resolves.toContain("Senior Product Engineer");
  }, 30_000);

  it("skips OCR when there is no page to read", async () => {
    await expect(recognizeImages([])).resolves.toBe("");
  });
});
