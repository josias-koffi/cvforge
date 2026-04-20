import { describe, expect, it } from "vitest";
import {
  buildOfferPreview,
  extractOfferMetadata,
  extractVisibleTextFromHtml,
  inferLocaleFromText,
} from "./offer-extraction";

describe("offer extraction helpers", () => {
  it("removes scripts, styles, and tags from html", () => {
    const text = extractVisibleTextFromHtml(`
      <html>
        <head>
          <style>.hidden { display: none; }</style>
          <script>window.bad = true;</script>
          <title>Senior Platform Engineer</title>
        </head>
        <body>
          <h1>Senior Platform Engineer</h1>
          <p>Build reliable APIs.</p>
        </body>
      </html>
    `);

    expect(text).toContain("Senior Platform Engineer");
    expect(text).toContain("Build reliable APIs.");
    expect(text).not.toContain("window.bad");
  });

  it("extracts metadata hints from common meta tags", () => {
    const metadata = extractOfferMetadata(`
      <html>
        <head>
          <meta property="og:title" content="Backend Engineer" />
          <meta property="og:site_name" content="Example Corp" />
          <meta name="description" content="Remote-first backend role." />
        </head>
      </html>
    `);

    expect(metadata).toEqual({
      description: "Remote-first backend role.",
      siteName: "Example Corp",
      title: "Backend Engineer",
    });
  });

  it("builds a short preview without dropping short text", () => {
    expect(buildOfferPreview("Short text")).toBe("Short text");
    expect(buildOfferPreview("A".repeat(400)).endsWith("...")).toBe(true);
  });

  it("infers locale from visible offer text", () => {
    expect(
      inferLocaleFromText("Responsibilities include mentoring and building APIs."),
    ).toBe("en");
    expect(
      inferLocaleFromText("Le poste inclut des responsabilites produit et de l'experience Node."),
    ).toBe("fr");
  });
});
