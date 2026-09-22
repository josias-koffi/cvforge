import { NotFoundException } from "@nestjs/common";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { legalDocuments } from "../database/schema";
import { createTestDatabase, type TestDatabase } from "../database/testing/test-database";
import { PgLegalDocumentsStore } from "./legal.pg-store";
import { LegalDocumentsService } from "./legal.service";

const DRAFT = {
  body: { en: "Draft body", fr: "Corps du brouillon" },
  slug: "terms" as const,
  title: { en: "Terms of use", fr: "Conditions d'utilisation" },
};

describe("LegalDocumentsService", () => {
  let testDatabase: TestDatabase;
  let store: PgLegalDocumentsStore;
  const audit = { recordLegalPublication: vi.fn() };
  const service = () =>
    new LegalDocumentsService(store, audit as never);

  beforeAll(async () => {
    testDatabase = await createTestDatabase();
    store = new PgLegalDocumentsStore(testDatabase.db);
  });

  afterAll(async () => {
    await testDatabase.close();
  });

  beforeEach(async () => {
    await testDatabase.reset();
    audit.recordLegalPublication.mockReset();
    await testDatabase.db.insert(legalDocuments).values(DRAFT);
  });

  it("keeps an unpublished document out of the public catalogue", async () => {
    await expect(service().listPublic()).resolves.toEqual([]);
    await expect(service().getPublic("terms")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("serves the document once published, and logs who published it", async () => {
    await service().publish("terms", "admin@example.com");

    const published = await service().getPublic("terms");

    expect(published).toMatchObject({ slug: "terms", version: 1 });
    expect(published.publishedAt).toBeTruthy();
    expect(audit.recordLegalPublication).toHaveBeenCalledWith({
      actorEmail: "admin@example.com",
      slug: "terms",
      version: 1,
    });
  });

  it("bumps the version on every publication", async () => {
    await service().publish("terms", "admin@example.com");
    const second = await service().publish("terms", "admin@example.com");

    expect(second.version).toBe(2);
  });

  it("edits a published document without republishing it", async () => {
    await service().publish("terms", "admin@example.com");

    const updated = await service().update("terms", {
      body: { en: "Edited", fr: "Modifie" },
      title: DRAFT.title,
    });

    // The edit is a draft on top of the live version: the version stands
    // until the admin publishes again.
    expect(updated.version).toBe(1);
    expect(updated.body.fr).toBe("Modifie");
  });

  it("reports a document that does not exist", async () => {
    await expect(service().getForAdmin("privacy")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
