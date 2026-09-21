import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { parseLegalDocumentInput, parseLegalDocumentSlug } from "./legal.validation";

const VALID = {
  body: { en: "Body", fr: "Corps" },
  title: { en: "Terms", fr: "Conditions" },
};

describe("parseLegalDocumentSlug", () => {
  it("accepts the four published documents", () => {
    for (const slug of ["terms", "sales-terms", "legal-notice", "privacy"]) {
      expect(parseLegalDocumentSlug(slug)).toBe(slug);
    }
  });

  it("rejects anything else", () => {
    expect(() => parseLegalDocumentSlug("cookies")).toThrow(BadRequestException);
    expect(() => parseLegalDocumentSlug(undefined)).toThrow(BadRequestException);
  });
});

describe("parseLegalDocumentInput", () => {
  it("keeps a complete bilingual document", () => {
    expect(parseLegalDocumentInput(VALID)).toEqual(VALID);
  });

  it("trims the text it keeps", () => {
    const parsed = parseLegalDocumentInput({
      body: { en: " Body ", fr: " Corps " },
      title: VALID.title,
    });

    expect(parsed.body).toEqual({ en: "Body", fr: "Corps" });
  });

  // Publishing one language without the other would put two different
  // contracts online, so a half-filled document is refused outright.
  it("refuses a document left empty in one language", () => {
    expect(() =>
      parseLegalDocumentInput({ ...VALID, body: { en: "Body", fr: "" } }),
    ).toThrow(BadRequestException);
    expect(() =>
      parseLegalDocumentInput({ ...VALID, title: { en: "", fr: "Conditions" } }),
    ).toThrow(BadRequestException);
  });

  it("refuses a body that is not an object", () => {
    expect(() => parseLegalDocumentInput({ ...VALID, body: "Corps" })).toThrow(
      BadRequestException,
    );
  });
});
