# Stage 2 — Design

**Agent**: designer
**Task**: US-055
**Date**: 2026-04-20

## Design Decision: Non-UI skip with technical contract specification

US-055 has no user-facing surface. It is a pure infrastructure/tooling story: dependency installation, type migration, adapter function, and a one-time seed migration script. No new screen, layout, or interaction is introduced.

## Technical contract (for developer handoff)

### 1. `toPuckConfig()` — adapter function

Location: `packages/ui/src/puck-config.ts`

```ts
import type { Config } from "@measured-co/puck";
import type { TemplateKind } from "@cvforge/types";
import { documentBlockRegistry } from "./document-blocks";

export function toPuckConfig(
  registry: typeof documentBlockRegistry,
  kind: TemplateKind,
): Config {
  const components: Config["components"] = {};

  for (const [name, definition] of Object.entries(registry)) {
    if (!(definition.templateKinds as readonly TemplateKind[]).includes(kind)) {
      continue;
    }

    components[name] = {
      label: definition.label,
      defaultProps: definition.defaultProps,
      fields: Object.fromEntries(
        (definition.fields as readonly string[]).map((field) => [
          field,
          { type: "text" },
        ]),
      ),
      render: definition.component as Config["components"][string]["render"],
    };
  }

  return { components };
}
```

### 2. `TemplateRecord.layout` type change

In `packages/types/src/index.ts`:
- Remove `TemplateLayoutBlock`, `TemplateLayout` interfaces
- Replace `layout: TemplateLayout` with `layout: import('@measured-co/puck').Data`
- Update `TemplateUpsertInput.layout` accordingly

### 3. Migration script

Location: `scripts/migrate-templates-to-puck.ts`

Input shape: `{ blocks: Array<{ id, name, props }> }`
Output shape (Puck `Data`):
```ts
{
  content: blocks.map(({ id, name, props }) => ({ type: name, props: { id, ...props } })),
  root: { props: {} }
}
```

The script should:
1. Accept the path to a `templates-state.json` file as argv
2. Read, transform, and overwrite it in place
3. Be idempotent (detect already-migrated entries by absence of `blocks` key)

### 4. Store normalization update

`normalizeTemplate()` in `templates.store.ts` must be updated to:
- Validate the Puck `Data` shape (`content[]`, `root.props`) instead of `layout.blocks[]`
- Produce a valid empty Puck `Data` (`{ content: [], root: { props: {} } }`) as the fallback instead of `createSeedLayout()`
- Seed layouts (`createSeedLayout`) must be converted to Puck `Data` format

### 5. UX risks
None — this story has no user-facing surface.

### 6. Accessibility
N/A — no DOM changes.

## Verdict
**PASS** — Design stage complete (non-UI skip with technical contract). No UX risks. Developer can proceed.
