# Stage 3 — Implement
**Agent**: developer  
**Run**: analyze-design-dev-review-20260601100000

### Verdict: PASS

### Summary
Trois fichiers créés / un modifié. Les bugs CSS sont corrigés dans `cv-html-templates.ts`. Le fichier d'origine (`cv-pdf-export.service.ts`, 840 lignes) est découpé en 4 modules distincts, tous sous le seuil warning de 400 lignes. 247 tests passent. Lint propre.

### Changes

**Fichiers créés :**
- `apps/api/src/cv-generation/cv-html-templates.ts` (319 lignes) — renderCvPdfHtml + renderLetterPdfHtml + helpers HTML
- `apps/api/src/cv-generation/cv-docx-templates.ts` (170 lignes) — renderCvDocx + renderLetterDocx + helpers DOCX
- `apps/api/src/cv-generation/cv-pdf-styles.ts` (57 lignes) — SHARED_PDF_STYLES

**Fichier modifié :**
- `apps/api/src/cv-generation/cv-pdf-export.service.ts` (246 lignes → réduit de 840) — service uniquement, importe depuis les 3 nouveaux modules

**Corrections CSS dans `cv-html-templates.ts` :**
| Propriété | Avant | Après |
|---|---|---|
| `background` | `#f6f3ed` (crème) | `#ffffff` (blanc pur) |
| `font-size` | `11.5pt` | `10.5pt` |
| `line-height` (CV) | `1.5` | `1.3` |
| `line-height` (LM) | `1.6` | `1.35` |
| `@page margin` | `12mm` | `10mm` |
| `border hero` | `#c8a96e` (doré) | `#b22222` (rouge foncé) |
| Titre candidat CV | `.contact` (gris) | `.title` (rouge `#b22222`) |
| `h2` | sans couleur | rouge + bordure rouge |
| `.sheet gap` | `1rem` | `0.5rem` |
| `.section gap` | `0.4rem` | `0.25rem` |
| `.item gap` | `0.4rem` | `0.2rem` |
| `h1 font-size` | `20pt` | `18pt` |

### Refactors applied
- `cv-pdf-export.service.ts` (840 → 246 lignes) — extraction HTML templates, DOCX templates, styles CSS
- `callPuppeteer()` extraite pour dédupliquer la gestion d'erreurs Puppeteer (commune aux PDF CV et LM)

### Findings
- [ADVISORY] `cv-html-templates.ts` : 319 lignes, au-dessus du target 300 mais sous le warning 400. Contenu majoritairement du CSS/HTML template string — difficilement compressible davantage sans sur-ingénierie.

### Next action
QA Reviewer vérifie les critères d'acceptation.
