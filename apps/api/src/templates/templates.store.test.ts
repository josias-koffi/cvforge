import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { TEMPLATE_KIND_CV, TEMPLATE_KIND_LETTER } from "@cvforge/types";
import { FileTemplatesStore } from "./templates.store";

const createdDirectories: string[] = [];

function makeStorePath() {
  const directory = mkdtempSync(join(tmpdir(), "cvforge-templates-store-"));
  createdDirectories.push(directory);

  return join(directory, "templates-state.json");
}

describe("FileTemplatesStore", () => {
  afterEach(() => {
    createdDirectories.splice(0).forEach((directory) => {
      rmSync(directory, { force: true, recursive: true });
    });
  });

  it("seeds the ATS templates when the state file is missing", () => {
    const store = new FileTemplatesStore(makeStorePath());

    const templates = store.list();

    expect(templates.map((template) => template.kind)).toEqual([
      TEMPLATE_KIND_CV,
      TEMPLATE_KIND_LETTER,
    ]);
    expect(templates.filter((template) => template.isDefault)).toHaveLength(2);
    expect(templates[0]?.layout.content).toHaveLength(5);
    expect(templates[1]?.layout.content).toHaveLength(3);
  });

  it("removes a template from the persisted state", () => {
    const path = makeStorePath();
    const store = new FileTemplatesStore(path);
    const created = store.create({
      active: false,
      categories: [],
      createdAt: "2026-04-20T12:00:00.000Z",
      id: "template-to-remove",
      isDefault: false,
      kind: TEMPLATE_KIND_CV,
      layout: { content: [], root: { props: {} } },
      locale: "fr",
      name: "To remove",
      updatedAt: "2026-04-20T12:00:00.000Z",
    });

    store.remove(created.id);

    expect(new FileTemplatesStore(path).findById(created.id)).toBeNull();
  });

  it("persists new templates and hydrates them back from disk", () => {
    const path = makeStorePath();
    const store = new FileTemplatesStore(path);
    const created = store.create({
      active: true,
      categories: ["Minimaliste"],
      createdAt: "2026-04-20T12:00:00.000Z",
      id: "template_custom",
      isDefault: false,
      kind: TEMPLATE_KIND_CV,
      layout: { content: [], root: { props: {} } },
      locale: "fr",
      name: "Template custom",
      updatedAt: "2026-04-20T12:00:00.000Z",
    });

    const hydrated = new FileTemplatesStore(path).findById(created.id);

    expect(hydrated?.name).toBe("Template custom");
    expect(hydrated?.categories).toEqual(["Minimaliste"]);
    expect(hydrated?.kind).toBe(TEMPLATE_KIND_CV);
  });
});
