import { TEMPLATE_KIND_CV, TEMPLATE_KIND_LETTER } from "@cvforge/types";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { PgTemplatesStore } from "./templates.pg-store";
import type { StoredTemplate } from "./templates.types";

let testDatabase: TestDatabase;
let store: PgTemplatesStore;

function makeTemplate(
  id: string,
  overrides: Partial<StoredTemplate> = {},
): StoredTemplate {
  return {
    active: true,
    categories: ["ATS"],
    createdAt: "2026-04-20T12:00:00.000Z",
    id,
    isDefault: false,
    kind: TEMPLATE_KIND_CV,
    layout: { content: [], root: { props: {} } },
    locale: "fr",
    name: `Template ${id}`,
    updatedAt: "2026-04-20T12:00:00.000Z",
    ...overrides,
  };
}

describe("PgTemplatesStore", () => {
  beforeAll(async () => {
    testDatabase = await createTestDatabase();
    store = new PgTemplatesStore(testDatabase.db);
  });

  afterAll(async () => {
    await testDatabase.close();
  });

  beforeEach(async () => {
    await testDatabase.reset();
  });

  it("round-trips a template, Puck layout included", async () => {
    const layout = {
      content: [{ type: "CVHeader", props: { id: "h", firstName: "Jane" } }],
      root: { props: { spacing: 2 } },
    };

    await store.create(makeTemplate("cv-1", { layout }));

    await expect(store.findById("cv-1")).resolves.toEqual(
      makeTemplate("cv-1", { layout }),
    );
  });

  it("returns null for an unknown template", async () => {
    await expect(store.findById("missing")).resolves.toBeNull();
  });

  it("orders by kind, then default first, then most recently updated", async () => {
    await store.create(
      makeTemplate("cv-old", { updatedAt: "2026-04-01T00:00:00.000Z" }),
    );
    await store.create(
      makeTemplate("cv-recent", { updatedAt: "2026-04-25T00:00:00.000Z" }),
    );
    await store.create(makeTemplate("cv-default", { isDefault: true }));
    await store.create(
      makeTemplate("letter-1", { kind: TEMPLATE_KIND_LETTER }),
    );

    const ids = (await store.list()).map(({ id }) => id);

    expect(ids).toEqual(["cv-default", "cv-recent", "cv-old", "letter-1"]);
  });

  it("overwrites an existing template on save", async () => {
    await store.create(makeTemplate("cv-1"));

    await store.save(makeTemplate("cv-1", { name: "Renamed" }));

    await expect(store.findById("cv-1")).resolves.toMatchObject({
      name: "Renamed",
    });
  });

  it("removes a template", async () => {
    await store.create(makeTemplate("cv-1"));

    await store.remove("cv-1");

    await expect(store.list()).resolves.toEqual([]);
  });

  it("refuses a second default for the same kind", async () => {
    await store.create(makeTemplate("cv-default", { isDefault: true }));

    await expect(
      store.create(makeTemplate("cv-other", { isDefault: true })),
    ).rejects.toThrow();
  });

  it("allows one default per kind", async () => {
    await store.create(makeTemplate("cv-default", { isDefault: true }));
    await store.create(
      makeTemplate("letter-default", {
        isDefault: true,
        kind: TEMPLATE_KIND_LETTER,
      }),
    );

    await expect(store.list()).resolves.toHaveLength(2);
  });
});
