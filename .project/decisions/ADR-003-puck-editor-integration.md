# ADR-003: Integrate Puck Editor as the WYSIWYG layer for template creation and CV editing

Date: 2026-04-20
Status: accepted
Note: The package was renamed from `@measured-co/puck` to `@puckeditor/core`. The installed package is `@puckeditor/core@0.21.2`. All references in this ADR using `@measured-co/puck` should be read as `@puckeditor/core`.

## Context

The vision mandates Puck Editor (`@measured-co/puck`) as the single WYSIWYG authoring surface across two distinct flows:

1. **Admin — template creation**: the admin assembles a CV or LM layout by dragging and dropping predefined blocks (CVHeader, ExperienceItem, SkillsList, etc.) into a canvas and saving the result as structured JSON.
2. **User — CV editing**: after AI generation, the user edits the content of their CV in the same visual environment before exporting to PDF.

Both flows were implemented without Puck during sprints 006–007 due to the absence of the dependency:

- The admin "Editeur Puck" card (`apps/app/app/admin/templates/page.tsx`) is a raw JSON textarea that requires the admin to hand-write `{ blocks: [] }` JSON — no drag-and-drop.
- The user CV editor (`apps/app/app/cv/[applicationId]/cv-editor.tsx`) is a form-based shadcn/ui editor that fulfills the content-editing use case but provides no visual layout feedback.

The block components and their registry (`packages/ui/src/document-blocks.tsx`) already exist and are Puck-ready: each entry exposes a `component`, `defaultProps`, and `fields` array that map directly to Puck's `ComponentConfig`. A migration is needed, not a rewrite.

## Decision

Install `@measured-co/puck` in `packages/ui` and integrate it at both surfaces as described below.

### 1. Package installation

```
pnpm add @measured-co/puck --filter @cvforge/ui
```

Puck is a peer of React 18 and has no server-side rendering support for its editor shell — the `<Puck>` component must always be rendered in a `"use client"` context. The `<Render>` component is SSR-safe and will be used for read-only surfaces (mobile preview, Puppeteer PDF rendering).

### 2. JSON format — adopt Puck's native `Data` type

The current `TemplateRecord.layout` uses `{ blocks: [] }` which is an internal approximation. Going forward the canonical format is Puck's own:

```ts
// Puck Data type (simplified)
{
  content: Array<{ type: string; props: Record<string, unknown> }>;
  root: { props: Record<string, unknown> };
}
```

A one-time migration script must be written before the Puck stories are merged to convert existing seeded templates from `{ blocks: [] }` to `{ content: [], root: { props: {} } }`. The `TemplateRecord` type in `packages/types` will be updated to use `import('@measured-co/puck').Data` as the type for `layout`.

### 3. Block registry → Puck ComponentConfig

The existing `documentBlockRegistry` entries already carry `component`, `defaultProps`, and `fields`. Each entry maps to a Puck `ComponentConfig` with text fields auto-derived from the `fields` array. A thin adapter function `toPuckConfig(registry)` will be added to `packages/ui` and exported alongside the registry.

```ts
// packages/ui/src/puck-config.ts
export function toPuckConfig(registry: typeof documentBlockRegistry, kind: TemplateKind) {
  // returns Puck Config with components filtered by templateKinds
}
```

### 4. Admin surface — full Puck drag-and-drop editor

Replace the raw JSON textarea with a `<PuckTemplateEditor>` Client Component exported from `packages/ui`. The component:
- Receives the current Puck `Data` and a `TemplateKind`
- Renders `<Puck config={toPuckConfig(documentBlockRegistry, kind)} data={initialData} onPublish={onSave} />`
- Calls a `PUT /templates/:id` endpoint on publish (replacing the current form POST)
- Is loaded via `next/dynamic` with `ssr: false` to avoid the SSR constraint

The admin page becomes a Server Component that fetches the template and passes data down; the editor panel becomes the `<PuckTemplateEditor>` Client Component.

### 5. User surface — Puck in content-locked mode

Replace `<CvEditor>` with a `<PuckCvEditor>` Client Component. The user edits content (text, dates, bullet points) but cannot add, remove, or reorder blocks — the layout structure is fixed by the chosen template. Puck supports this via the `permissions` API:

```ts
<Puck
  config={toPuckConfig(documentBlockRegistry, "cv")}
  data={cvData}
  permissions={{ delete: false, drag: false, duplicate: false, insert: false }}
  onPublish={onSave}
/>
```

For mobile, the existing `<CvDocumentPreview>` using `<Render>` from Puck replaces the current preview component.

### 6. Puppeteer PDF rendering

The Puppeteer service renders a standalone Next.js route (`/cv/:id/print`) that uses Puck's `<Render>` (SSR-safe) to produce the document HTML. This route is not accessible to end users and accepts an auth token from the API service. No changes to the Puppeteer service itself are needed.

## Consequences

- **Admin**: drag-and-drop template authoring replaces the textarea. The admin can visually compose layouts from the existing block palette without knowing the JSON structure.
- **User**: the CV editing experience becomes visually faithful — edits reflect immediately in the document layout, eliminating the split panel approximation of the current form editor.
- **Uniformity**: both surfaces use the same block registry, the same Puck config adapter, and the same Puck `Data` JSON stored in PostgreSQL. There is one source of truth for layout structure.
- **Migration required**: existing template JSON in the database and in seed files must be converted to Puck's `Data` format before these stories ship. This is a one-time script, not an ongoing concern.
- **Bundle size**: `@measured-co/puck` adds ~120 kB gzipped to the client bundle. It is loaded only on the admin template editor and user CV editor routes — not on the dashboard, landing, or any other page.
- **SSR constraint**: `<Puck>` (editor) cannot run server-side. `<Render>` (read-only) is SSR-safe. Both routes that embed the editor must use `next/dynamic` with `ssr: false`.

## Alternatives considered

- **Keep the current form editor and textarea as permanent MVP surfaces**: rejected because it violates the core product promise (visual CV editing) and forces the admin to hand-write layout JSON indefinitely, which is not a viable authoring workflow.
- **Build a custom drag-and-drop editor from scratch**: rejected — high complexity, high maintenance, no benefit over adopting Puck which was designed for exactly this use case and whose data format the codebase already approximates.
- **Use a different editor (e.g., GrapeJS, TipTap, Lexical)**: rejected — Puck is block-based and React-native, which aligns with the existing component model. The others target rich-text or HTML editing, not structured block layouts.
