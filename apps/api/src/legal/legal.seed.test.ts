import { legalDocumentSlugs } from "@cvforge/types";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase, type TestDatabase } from "../database/testing/test-database";
import { PgLegalDocumentsStore } from "./legal.pg-store";

/**
 * The initial texts ship in the migration, so a fresh environment is never
 * online without its legal pages. This database is deliberately not reset:
 * what is under test is precisely what the migration left behind.
 */
describe("legal documents seed", () => {
  let testDatabase: TestDatabase;
  let store: PgLegalDocumentsStore;

  beforeAll(async () => {
    testDatabase = await createTestDatabase();
    store = new PgLegalDocumentsStore(testDatabase.db);
  });

  afterAll(async () => {
    await testDatabase.close();
  });

  it("publishes the four documents in both languages", async () => {
    const documents = await store.listAll();

    expect(documents.map((document) => document.slug).sort()).toEqual(
      [...legalDocumentSlugs].sort(),
    );

    for (const document of documents) {
      expect(document.publishedAt, document.slug).toBeTruthy();
      expect(document.version, document.slug).toBe(1);

      for (const locale of ["fr", "en"] as const) {
        expect(document.title[locale], `${document.slug}.title.${locale}`).toBeTruthy();
        // Long enough that a truncated or mis-escaped seed shows up here.
        expect(
          document.body[locale].length,
          `${document.slug}.body.${locale}`,
        ).toBeGreaterThan(400);
      }
    }
  });

  it("leaves the publisher identity as explicit placeholders", async () => {
    const notice = await store.findBySlug("legal-notice");

    expect(notice?.body.fr).toContain("[RAISON SOCIALE]");
    expect(notice?.body.en).toContain("[LEGAL ENTITY]");
  });
});
