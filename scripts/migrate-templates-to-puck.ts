#!/usr/bin/env tsx
/**
 * Migrates a templates-state.json from the legacy { blocks: [] } format
 * to Puck's native { content: [], root: { props: {} } } Data format.
 *
 * Usage: tsx scripts/migrate-templates-to-puck.ts <path-to-templates-state.json>
 *
 * Idempotent: entries already in Puck format (having `content`) are left unchanged.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

interface LegacyBlock {
  id: string;
  name: string;
  props: Record<string, unknown>;
}

interface LegacyLayout {
  blocks: LegacyBlock[];
}

interface PuckDataItem {
  type: string;
  props: Record<string, unknown> & { id?: string };
}

interface PuckData {
  content: PuckDataItem[];
  root: { props: Record<string, unknown> };
}

function isLegacyLayout(layout: unknown): layout is LegacyLayout {
  return (
    typeof layout === "object" &&
    layout !== null &&
    "blocks" in layout &&
    Array.isArray((layout as Record<string, unknown>).blocks)
  );
}

function migrateLayout(layout: unknown): PuckData {
  if (isLegacyLayout(layout)) {
    return {
      content: layout.blocks.map(({ id, name, props }) => ({
        type: name,
        props: { id, ...props },
      })),
      root: { props: {} },
    };
  }

  if (
    typeof layout === "object" &&
    layout !== null &&
    "content" in layout &&
    Array.isArray((layout as Record<string, unknown>).content)
  ) {
    return layout as PuckData;
  }

  return { content: [], root: { props: {} } };
}

const filePath = process.argv[2];

if (!filePath) {
  console.error("Usage: tsx scripts/migrate-templates-to-puck.ts <path-to-templates-state.json>");
  process.exit(1);
}

const absolutePath = resolve(filePath);

const raw = JSON.parse(readFileSync(absolutePath, "utf8")) as {
  templates: Record<string, { layout: unknown; [key: string]: unknown }>;
};

let migrated = 0;
let skipped = 0;

for (const [id, template] of Object.entries(raw.templates)) {
  if (isLegacyLayout(template.layout)) {
    raw.templates[id] = { ...template, layout: migrateLayout(template.layout) };
    migrated++;
  } else {
    skipped++;
  }
}

writeFileSync(absolutePath, JSON.stringify(raw, null, 2));

console.log(
  `Migration complete: ${migrated} template(s) migrated, ${skipped} already in Puck format.`,
);
