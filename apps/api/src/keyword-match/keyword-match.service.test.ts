import { BadRequestException } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildPdf, pdfFile } from "../ats/testing/build-pdf";
import { KeywordMatchModule } from "./keyword-match.module";
import { KeywordMatchService } from "./keyword-match.service";

const CV = [
  "Claire Martin",
  "claire.martin@example.com | Lyon",
  "Experience professionnelle",
  "Developpeuse backend, Acme 2021 - present",
  "- Conception d'API Node.js en TypeScript pour 40 000 utilisateurs.",
  "- Migration des donnees vers PostgreSQL et mise en place de Docker.",
  "Competences",
  "TypeScript, Node.js, PostgreSQL, Docker",
].join("\n");

const OFFER = `Nous recherchons une developpeuse backend TypeScript pour notre
equipe produit. Vous concevrez des API Node.js, maintiendrez nos bases
PostgreSQL et deploierez sur Kubernetes. Terraform et Kafka sont un plus.
TypeScript au quotidien, revues de code et tests automatises.`;

const service = new KeywordMatchService();

describe("KeywordMatchService", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the coverage and the present and missing terms", async () => {
    const result = await service.match({
      file: pdfFile(buildPdf(CV)),
      offerText: OFFER,
    });

    expect(result.matched).toEqual(
      expect.arrayContaining(["typescript", "postgresql", "backend"]),
    );
    expect(result.missing).toEqual(
      expect.arrayContaining(["kubernetes", "terraform", "kafka"]),
    );
    expect(result.coverage).toBeGreaterThan(0);
    expect(result.coverage).toBeLessThan(100);
    expect(result.matchedCount + result.missingCount).toBeGreaterThan(
      result.matched.length,
    );
  });

  /**
   * Zero model call (US-136): the service has no dependency at all, the
   * module imports no model or database module, and nothing leaves the
   * process while it runs.
   */
  describe("costs nothing and keeps nothing", () => {
    it("has no dependency to call a model or write a row with", () => {
      const params =
        (Reflect.getMetadata("design:paramtypes", KeywordMatchService) as
          | unknown[]
          | undefined) ?? [];
      const imports = Reflect.getMetadata(
        "imports",
        KeywordMatchModule,
      ) as Array<{ name: string }>;

      expect(params).toHaveLength(0);
      expect(imports.map((module) => module.name)).toEqual(["LeadsModule"]);
    });

    it("makes no network call while comparing", async () => {
      const fetch = vi.spyOn(globalThis, "fetch");

      await service.match({ file: pdfFile(buildPdf(CV)), offerText: OFFER });

      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe("what it refuses, with a code", () => {
    it("requires a CV file", async () => {
      await expect(
        service.match({ file: undefined, offerText: OFFER }),
      ).rejects.toMatchObject({ response: { code: "CV_FILE_REQUIRED" } });
    });

    it("refuses anything but a PDF or a DOCX", async () => {
      await expect(
        service.match({
          file: pdfFile(Buffer.from("GIF89a not a cv")),
          offerText: OFFER,
        }),
      ).rejects.toMatchObject({ response: { code: "CV_FILE_UNSUPPORTED" } });
    });

    it.each([undefined, 42, "Développeur TypeScript"])(
      "requires the full offer text (%s)",
      async (offerText) => {
        const refusal = service.match({
          file: pdfFile(buildPdf(CV)),
          offerText,
        });

        await expect(refusal).rejects.toBeInstanceOf(BadRequestException);
        await expect(refusal).rejects.toMatchObject({
          response: { code: "OFFER_TEXT_REQUIRED" },
        });
      },
    );

    it("checks the offer before reading the CV", async () => {
      await expect(
        service.match({ file: pdfFile(buildPdf("")), offerText: "court" }),
      ).rejects.toMatchObject({ response: { code: "OFFER_TEXT_REQUIRED" } });
    });

    it("refuses a CV with too little text", async () => {
      await expect(
        service.match({ file: pdfFile(buildPdf("Claire")), offerText: OFFER }),
      ).rejects.toMatchObject({ response: { code: "CV_NOT_ENOUGH_TEXT" } });
    });

    it("refuses an offer with no usable term", async () => {
      const boilerplate =
        "Nous recherchons pour notre equipe avec vous. ".repeat(8);

      await expect(
        service.match({ file: pdfFile(buildPdf(CV)), offerText: boilerplate }),
      ).rejects.toMatchObject({ response: { code: "OFFER_NOT_USABLE" } });
    });
  });
});
