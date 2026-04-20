# Stage 2 — Design (Designer)

**Date**: 2026-04-20
**Verdict**: PASS

## UI / UX Design Decisions

### Component architecture

```
page.tsx (Server Component)
├── PuckTemplateEditor (Client, loaded via next/dynamic ssr:false)
│   └── <Puck config={...} data={...} onPublish={...} />
└── Metadata form (Server, same page)
    └── hidden layout input (mirrors current layout for metadata-only saves)
```

### Edit card layout (replaces current)

**Métadonnées section** (HTML form, action=/admin/templates/save):
- Name, locale, categories, active, isDefault as before
- Hidden `<input name="layout" value={JSON of current layout}>`  ← needed for the existing save route
- "Enregistrer les métadonnées" button

**Canvas Puck section** (dynamic client component):
- `<PuckTemplateEditor templateId kind initialData>`
- Puck renders its own header with drag-and-drop canvas + "Publish" button
- Success/error banner above the canvas

### Create card layout
- Keep all metadata fields
- Change hidden layout default from `{ blocks: [] }` (invalid) to `{ content: [], root: { props: {} } }`
- After create redirect, the selected template shows empty Puck canvas → satisfies AC 5

### New API route: /admin/templates/publish-layout
- Method: POST
- Body: `{ templateId: string; layout: PuckData }`
- Returns: `{ ok: true; templateId: string }` or `{ ok: false; error: string }`
- Forwards to NestJS `PUT /templates/:id` with `{ layout }`

### next.config.ts update
- Add `transpilePackages: ["@puckeditor/core"]` for CSS and ESM processing

### UX risks
- Puck editor height: wrap in a `div` with `min-height: 70vh` to give it working space
- SSR: `ssr: false` prevents any server-render of the Puck canvas; the metadata form remains server-rendered
- kind mismatch: `toPuckConfig` filters blocks; template kind is fixed after creation so no dynamic re-filtering needed

## Decision: no-UI skip?
No. This story is fundamentally UI work — replacing a textarea with a live drag-and-drop canvas.
