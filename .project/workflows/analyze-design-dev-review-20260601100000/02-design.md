# Stage 2 — Design
**Agent**: designer  
**Run**: analyze-design-dev-review-20260601100000

### Verdict: PASS

### Summary
Le modèle de référence dicte la direction visuelle sans ambiguïté. Pas de décision de design subjective à prendre — il s'agit de corriger un écart entre le rendu actuel et le modèle attendu.

## Design Thinking

**Purpose**: Exporter un CV et une lettre de motivation professionnels en PDF A4, prêts à envoyer à un recruteur.

**Tone**: `luxury/refined` — fond blanc pur, typographie serif (EB Garamond déjà présente), accents rouge professionnel, hiérarchie typographique claire.

**Differentiator**: Layout épuré qui communique sérieux et lisibilité en un coup d'œil.

**Anti-convergence check**: Pas de changement de police (EB Garamond est intentionnel), pas de gradient, pas de card grid.

## Spec visuelle cible (issue des modèles de référence)

| Élément | Valeur actuelle | Valeur cible |
|---|---|---|
| `background` (body) | `#f6f3ed` | `#ffffff` |
| Accent / bordures hero | `#c8a96e` (doré) | `#b22222` (rouge foncé) |
| Titre candidat (CV hero) | `.contact` gris | `.title` rouge `#b22222` |
| En-têtes h2 | sans couleur | `#b22222` + bordure basse rouge |
| `font-size` | `11.5pt` | `10.5pt` |
| `line-height` (CV) | `1.5` | `1.3` |
| `line-height` (LM) | `1.6` | `1.35` |
| `@page margin` | `12mm` | `10mm` |
| `.sheet gap` | `1rem` | `0.5rem` |
| `.section gap` | `0.4rem` | `0.25rem` |
| `.item gap` | `0.4rem` | `0.2rem` |
| `h1 font-size` | `20pt` | `18pt` |
| `h2 margin-bottom` | `0.45rem` | `0.3rem` |

## Developer brief

1. Extraire les fonctions HTML (`renderCvPdfHtml`, `renderLetterPdfHtml`, helpers `escapeHtml`, `escapeAttribute`, `renderList`) dans `cv-html-templates.ts`.
2. Extraire les fonctions DOCX (`renderCvDocx`, `renderLetterDocx`, `paragraph`, `sectionHeading`, `bullet`) dans `cv-docx-templates.ts`.
3. `cv-pdf-export.service.ts` garde : types, builders de filename, `resolvePdfExportConfig`, `postPdf`, `CvPdfExportService` — cible < 220 lignes.
4. Dans `cv-html-templates.ts`, appliquer toutes les valeurs de la table ci-dessus.
5. Ajouter la classe `.title` (rouge) pour le sous-titre du candidat dans le hero CV.
6. Ajouter `color: #b22222` + `border-bottom: 1.5px solid #b22222` + `padding-bottom: 0.15rem` sur `h2`.

### Next action
Developer implémente le split + fix CSS, puis les tests sont joués.
