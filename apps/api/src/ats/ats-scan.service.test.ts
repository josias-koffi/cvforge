import { deflateSync } from "node:zlib";
import {
  BadRequestException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AtsImpactService } from "./ats-impact.service";
import { AtsScanService } from "./ats-scan.service";
import type { CvSourceFile } from "../cv-generation/cv-text-extraction";
import { InMemoryAtsScanStore } from "./testing/in-memory-ats-store";

/**
 * A distinctive sentence: the RGPD test asserts it never reaches the row that
 * is written, whatever path the scan took.
 */
const CV_SENTENCE =
  "Reduit le temps de build TypeScript de 40% en parallelisant la chaine CI interne.";

const CV_BODY = [
  "Jean Dupont",
  "jean.dupont@example.com | +33 6 12 34 56 78 | Lyon",
  "Profil",
  "Ingenieur plateforme, huit ans d'experience sur des chaines de livraison.",
  "Experience professionnelle",
  "Ingenieur plateforme, Acme 01/2022 - present",
  `- ${CV_SENTENCE}`,
  "- Optimise 12 requetes PostgreSQL critiques, divisant par 3 la latence.",
  "Formation",
  "Master informatique, Universite de Lyon 2016",
  "Competences",
  "TypeScript, PostgreSQL, Docker",
].join("\n");

/** A single-page PDF carrying a real text layer, as a real upload would. */
function buildPdf(text: string) {
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
        ...offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`),
        `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${length}\n%%EOF\n`,
      ].join(""),
      "latin1",
    ),
  );

  return Buffer.concat(chunks);
}

function makeFile(buffer = buildPdf(CV_BODY)): CvSourceFile {
  return {
    buffer,
    mimetype: "application/pdf",
    originalname: "cv.pdf",
    size: buffer.length,
  };
}

function scanRequest(overrides: Partial<Parameters<AtsScanService["scanPublic"]>[0]> = {}) {
  return {
    file: makeFile(),
    ip: "203.0.113.7",
    locale: "fr",
    offerText: null,
    ...overrides,
  };
}

describe("AtsScanService", () => {
  let store: InMemoryAtsScanStore;
  let impact: { assess: ReturnType<typeof vi.fn> };
  let service: AtsScanService;

  beforeEach(() => {
    store = new InMemoryAtsScanStore();
    impact = { assess: vi.fn().mockResolvedValue(null) };
    service = new AtsScanService(
      store,
      impact as unknown as AtsImpactService,
      300,
      "test-salt",
    );
  });

  describe("scanning a CV", () => {
    it("returns a score, a band and the free highlights", async () => {
      const response = await service.scanPublic(scanRequest());

      expect(response.overallScore).toBeGreaterThan(0);
      expect(response.overallScore).toBeLessThanOrEqual(100);
      expect(response.band).toBeTruthy();
      expect(response.highlights.length).toBeLessThanOrEqual(3);
      expect(response.scanId).toBeTruthy();
    });

    /** The gate is the payload, not a blur in the page. */
    it("never puts the dimensions on the wire", async () => {
      const response = await service.scanPublic(scanRequest());

      expect(response).not.toHaveProperty("dimensions");
      expect(response).not.toHaveProperty("findings");
      expect(JSON.stringify(response)).not.toContain("machineReadability");
    });

    it("reports how many dimensions it could score and how many findings stay locked", async () => {
      const response = await service.scanPublic(scanRequest());

      expect(response.scoredDimensionCount).toBeGreaterThan(0);
      expect(response.lockedFindingCount).toBeGreaterThanOrEqual(0);
    });

    it("consults the model with the extracted text", async () => {
      await service.scanPublic(scanRequest());

      expect(impact.assess).toHaveBeenCalledTimes(1);
    });

    it("still scores when the model declines to answer", async () => {
      impact.assess.mockResolvedValue(null);

      const response = await service.scanPublic(scanRequest());

      expect(response.overallScore).toBeGreaterThan(0);
    });

    it("scores against a pasted offer when one is supplied", async () => {
      const withOffer = await service.scanPublic(
        scanRequest({
          offerText:
            "Nous recherchons un ingenieur plateforme maitrisant TypeScript, PostgreSQL et Docker.",
        }),
      );

      // The offer makes one more dimension observable.
      const without = await service.scanPublic(scanRequest());

      expect(withOffer.scoredDimensionCount).toBeGreaterThan(
        without.scoredDimensionCount,
      );
    });
  });

  /**
   * The invariant that keeps an anonymous visitor's CV from becoming personal
   * data we hold (ADR-022).
   */
  describe("what it persists", () => {
    it("writes no CV text anywhere in the row", async () => {
      await service.scanPublic(scanRequest());

      const [row] = store.scans;

      expect(row).toBeDefined();
      expect(JSON.stringify(row)).not.toContain(CV_SENTENCE);
      expect(JSON.stringify(row)).not.toContain("jean.dupont@example.com");
      expect(JSON.stringify(row)).not.toContain("Dupont");
      expect(JSON.stringify(row)).not.toContain("PostgreSQL");
    });

    it("hashes the visitor's address instead of storing it", async () => {
      await service.scanPublic(scanRequest());

      const [row] = store.scans;

      expect(row?.ipHash).toMatch(/^[0-9a-f]{64}$/);
      expect(row?.ipHash).not.toContain("203.0.113.7");
    });

    it("stores no hash at all when the address is unknown", async () => {
      await service.scanPublic(scanRequest({ ip: null }));

      expect(store.scans[0]?.ipHash).toBeNull();
    });

    it("gives the same address the same hash, and different ones different hashes", async () => {
      await service.scanPublic(scanRequest({ ip: "203.0.113.7" }));
      await service.scanPublic(scanRequest({ ip: "203.0.113.7" }));
      await service.scanPublic(scanRequest({ ip: "198.51.100.4" }));

      expect(store.scans[0]?.ipHash).toBe(store.scans[1]?.ipHash);
      expect(store.scans[0]?.ipHash).not.toBe(store.scans[2]?.ipHash);
    });

    it("stamps the scan with a retention deadline", async () => {
      const response = await service.scanPublic(scanRequest());

      const days =
        (new Date(response.expiresAt).getTime() - Date.now()) /
        (24 * 60 * 60 * 1000);

      expect(days).toBeGreaterThan(29);
      expect(days).toBeLessThanOrEqual(30);
    });

    it("records the scan as coming from the public surface", async () => {
      await service.scanPublic(scanRequest());

      expect(store.scans[0]?.source).toBe("public");
      expect(store.scans[0]?.engineVersion).toBeTruthy();
    });
  });

  /**
   * OCR is refused on this route: it costs seconds of CPU with no job queue
   * behind it. A scanned CV is not an error — it is the most useful thing this
   * page can tell a candidate, because an ATS reads it as a blank page.
   */
  describe("a PDF with no text layer", () => {
    const scanned = () => makeFile(buildPdf(""));

    it("scores it rather than failing", async () => {
      const response = await service.scanPublic(
        scanRequest({ file: scanned() }),
      );

      expect(response.scanId).toBeTruthy();
      expect(response.overallScore).toBeGreaterThanOrEqual(0);
    });

    it("marks the result as partial", async () => {
      const response = await service.scanPublic(
        scanRequest({ file: scanned() }),
      );

      expect(response.partial).toBe(true);
    });

    it("scores it far below the same CV with a text layer", async () => {
      const readable = await service.scanPublic(scanRequest());
      const image = await service.scanPublic(scanRequest({ file: scanned() }));

      expect(image.overallScore).toBeLessThan(readable.overallScore);
    });

    it("does not pay for a model call on an empty string", async () => {
      impact.assess.mockClear();

      await service.scanPublic(scanRequest({ file: scanned() }));

      expect(impact.assess).not.toHaveBeenCalled();
    });

    it("tells the visitor the text layer is missing", async () => {
      const response = await service.scanPublic(
        scanRequest({ file: scanned() }),
      );

      expect(response.highlights).toContain("NO_TEXT_LAYER");
    });
  });

  /**
   * DOCX is accepted in production and has no page geometry to inspect, so the
   * readability dimension has nothing to judge and steps aside — the CV is
   * still scored on everything else.
   */
  describe("a DOCX upload", () => {
    async function docxFile(): Promise<CvSourceFile> {
      const { Document, Packer, Paragraph } = await import("docx");
      const buffer = await Packer.toBuffer(
        new Document({
          sections: [
            {
              children: CV_BODY.split("\n").map(
                (line) => new Paragraph({ text: line }),
              ),
            },
          ],
        }),
      );

      return {
        buffer: Buffer.from(buffer),
        mimetype:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        originalname: "cv.docx",
        size: buffer.byteLength,
      };
    }

    it("scores a real Word document", async () => {
      const response = await service.scanPublic(
        scanRequest({ file: await docxFile() }),
      );

      expect(response.overallScore).toBeGreaterThan(0);
      expect(response.partial).toBe(false);
    });

    it("stores no CV text from it either", async () => {
      await service.scanPublic(scanRequest({ file: await docxFile() }));

      expect(JSON.stringify(store.scans[0])).not.toContain(CV_SENTENCE);
    });
  });

  describe("what it refuses", () => {
    it("requires a file", async () => {
      await expect(
        service.scanPublic(scanRequest({ file: undefined })),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    /** The declared mimetype is the client's word; the first bytes are not. */
    it("refuses a file whose bytes are not a PDF or a DOCX", async () => {
      const disguised: CvSourceFile = {
        buffer: Buffer.from("#!/bin/sh\nrm -rf /"),
        mimetype: "application/pdf",
        originalname: "cv.pdf",
        size: 18,
      };

      await expect(
        service.scanPublic(scanRequest({ file: disguised })),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("refuses a file over five megabytes", async () => {
      const huge = makeFile();
      huge.size = 6 * 1024 * 1024;

      await expect(
        service.scanPublic(scanRequest({ file: huge })),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("refuses a readable PDF that carries almost no text", async () => {
      await expect(
        service.scanPublic(scanRequest({ file: makeFile(buildPdf("Jean")) })),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it("writes nothing when it refuses", async () => {
      await service
        .scanPublic(scanRequest({ file: makeFile(buildPdf("Jean")) }))
        .catch(() => undefined);

      expect(store.scans).toHaveLength(0);
    });
  });

  describe("the daily budget", () => {
    /** Checked before parsing and before the model call: it must stop spending. */
    it("answers 503 once the day's scans are spent", async () => {
      service = new AtsScanService(
        store,
        impact as unknown as AtsImpactService,
        1,
        "test-salt",
      );

      await service.scanPublic(scanRequest());

      await expect(service.scanPublic(scanRequest())).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });

    it("does not call the model once the budget is spent", async () => {
      service = new AtsScanService(
        store,
        impact as unknown as AtsImpactService,
        1,
        "test-salt",
      );

      await service.scanPublic(scanRequest());
      impact.assess.mockClear();

      await service.scanPublic(scanRequest()).catch(() => undefined);

      expect(impact.assess).not.toHaveBeenCalled();
    });
  });
});
