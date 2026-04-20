# Stage 2 — Design

**Agent**: designer
**Date**: 2026-04-20

## Component Architecture

```
page.tsx (Server Component)
  │  fetches CVDocumentContent
  │  converts → PuckData via cvContentToPuckData()
  └─ <CvEditor applicationId puckData> ("use client")
       ├─ Card (header info + badge + PDF download button) — renders in SSR
       ├─ .cvforge-cv-editor__mobile-only
       │    └─ <Render config data> from @puckeditor/core (SSR-safe, no dynamic)
       └─ .cvforge-cv-editor__desktop-only
            └─ <PuckCvEditorLoader applicationId initialData>
                 └─ next/dynamic({ ssr: false })
                      └─ <PuckCvEditor applicationId initialData> ("use client")
                           ├─ toPuckConfig(documentBlockRegistry, "cv")
                           ├─ <Puck config data onPublish permissions> — client only
                           └─ onPublish: puckDataToCvContent() → PUT /cv/:id/save
```

## New Files

| File | Purpose |
|------|---------|
| `apps/app/app/cv/[applicationId]/cv-content-to-puck.ts` | `CVDocumentContent → PuckData` converter |
| `apps/app/app/cv/[applicationId]/puck-data-to-cv-content.ts` | `PuckData → CVDocumentContent` converter |
| `apps/app/app/cv/[applicationId]/puck-cv-editor.tsx` | "use client" Puck editor with `permissions` |
| `apps/app/app/cv/[applicationId]/puck-cv-editor-loader.tsx` | `next/dynamic` wrapper |
| `apps/app/app/cv/[applicationId]/cv-content-to-puck.test.ts` | Converter unit tests |
| `apps/app/app/cv/[applicationId]/puck-data-to-cv-content.test.ts` | Reverse converter unit tests |

## Modified Files

| File | Change |
|------|--------|
| `cv-editor.tsx` | Replace form body with Render (mobile) + PuckCvEditorLoader (desktop) |
| `page.tsx` | Add cvContentToPuckData conversion, change CvEditor props |
| `page.test.tsx` | Update assertions to reflect new markup |

## UX decisions

- The PDF download button is placed OUTSIDE the Puck canvas in `CvEditor`, so it renders in SSR and is visible regardless of JS
- Puck's built-in "Publish" button handles CV content saving
- The "Revenir au CV généré" reset button is dropped (no equivalent in content-only Puck mode; user can re-generate from the candidature page)
- Mobile shows `<Render>` — a static view of the CV structure with real field values; it is NOT editable

## SSR safety

- `<Render>` from `@puckeditor/core` is imported directly (no `ssr: false`) per acceptance criteria
- `<Puck>` is wrapped in `next/dynamic({ ssr: false })` to prevent SSR crashes
- CSS import (`puck.css`) stays inside `puck-cv-editor.tsx` (client-only)

## Pass Verdict

✅ Design fits scope, UX risks are explicit, no ambiguities.
