# Stage 1 — Analyze (Product Owner)
**Run ID:** 20260420-163000-us-024
**Date:** 2026-04-20

## Scope Verdict: CLEAR ✅

## Acceptance Criteria — Testability Review

### AC1: Une prévisualisation live existe
**Status:** A `TemplatePreview` component already exists. It renders blocks by merging defaultProps with block.props. However it has no data injection mechanism — it cannot receive a full normalized content payload to override rendering.

**Gap:** Need to add a `previewContent` prop (or always-on fixture mode) so the "Aperçu live" section in the admin renders richly populated data rather than sparse template-authored props.

**Testable:** ✅ Admin `/admin/templates` page renders `TemplatePreview` → markup includes rich fictitious content (real-looking names, job titles, company names, dates). The preview section is always visible when a template is selected.

### AC2: Les données fictives couvrent les cas principaux
**Status:** Current defaultProps only cover partial cases (1 experience, no certifications, languages, projects). The normalized content schema supports all of these.

**Gap:** Need a complete fixture covering: candidate identity, ≥2 experiences, ≥1 education, skills (hard + soft), ≥1 certification, ≥1 language, ≥1 project, and letter content (3 paragraphs).

**Testable:** ✅ The fixture object contains populated arrays for all section types defined in `CVDocumentContent` and `LetterDocumentContent`. Test verifies the fixture keys match the type contract.

### AC3: Le rendu respecte le design "Papier & Crayon"
**Status:** Existing preview uses `backgroundColor: "#FBF8F2"` paper-ivory background and `#D9D4CA` borders. Font stack is not explicitly set to Playfair Display / EB Garamond.

**Gap:** The preview container should use the declared CV typography (`EB Garamond` or `Libre Baskerville` for content) and the correct paper background. A labeled "Prévisualisation — données fictives" heading should make the source of data explicit to the admin.

**Testable:** ✅ Preview container markup includes the "Papier & Crayon" paper background token and a clear label indicating fictitious data.

## Product Boundaries

### In scope (US-024):
1. **Preview fixture** — `CVDocumentContent`-shaped fixture with rich data for all main sections
2. **Letter fixture** — `LetterDocumentContent`-shaped fixture
3. **Content injection** — `TemplatePreview` accepts optional `previewContent` and maps it to block renders, expanding arrays into multiple block instances
4. **"Papier & Crayon" wrapper** — preview container styled with paper token, CV typography hint, and a clear "données fictives" label
5. The fixture lives in `packages/ui` (UI-layer concern, re-exportable)

### Out of scope:
- Real user data injection (that belongs to the generation pipeline)
- Interactive editing of the preview
- Puppeteer/PDF export triggered from preview
- Drag-and-drop layout reordering

## Missing Product Questions: None blocking.
