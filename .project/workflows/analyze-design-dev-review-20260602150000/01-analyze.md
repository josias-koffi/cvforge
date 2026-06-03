---
tags:
  [
    run/analyze-design-dev-review-20260602150000,
    workflow/analyze-design-dev-review,
    agent/product-owner,
    stage/01,
  ]
run: "[[workflows/runs/analyze-design-dev-review-20260602150000/task]]"
workflow_def: "[[workflows/definitions/analyze-design-dev-review]]"
agent: "[[agents/product-owner/agent]]"
---

# Stage 01 — Analyze (Product Owner)

### Verdict: PASS

### Summary

La demande est claire et conforme à la vision (§8.1 génération CV ATS). Elle couvre deux périmètres distincts : (1) la mise en forme du PDF exporté (styles CSS, structure HTML) et (2) le contenu généré par l'IA (prompts). Aucun nouveau concept produit n'est introduit — c'est une amélioration qualitative du pipeline existant.

### Acceptance criteria

1. **Marges PDF** — `@page { margin: 20mm 25mm }` pour CV, existant LM déjà 20mm 25mm ✓ attendu
2. **En-tête CV** — `h1` 22-26pt ; titre `p.title` 10-11pt ; coordonnées `p.contact` 9-10pt
3. **Titres de section** — `h2` 9-10pt, petites capitales (`font-variant: small-caps`) ou bold ; espacement avant section 8-10pt
4. **Dates** — format "Jan. 2022 – Oct. 2024" dans le prompt (AI doit produire ce format) ; "Présent" pour poste en cours
5. **Typographie** — interligne 1,15 (actuellement 1,3) ; espacement entre expériences 6-8pt
6. **Hiérarchie visuelle expériences** — `h3` position bold 10,5-11pt ; entreprise `p.muted` regular/italic ; bullets indentés
7. **Compétences** — 2 blocs HTML distincts (hard/soft), puces `<ul>` courtes (pas inline text)
8. **Outils** — sous-section dédiée si le profil en contient (via prompt AI)
9. **Langues** — format "Langue — Niveau / Descriptif" dans prompt et rendu HTML
10. **Prompt CV** — interdiction "Je suis" en summary ; structure accroche [titre]+[années]+[domaine]+[valeur] ; dates "Mois. AAAA" ; 3-5 bullets/poste avec verbes d'action + métriques
11. **Tests** — lint vert, tests existants passants

### Missing product questions

Aucune — le cahier d'instructions est exhaustif et ne sort pas du périmètre vision §8.1.

### Scope boundary

- In scope : `cv-pdf-styles.ts`, `cv-html-templates.ts`, `cv-generation.service.ts` (prompts uniquement)
- Out of scope : `cv-docx-templates.ts` (DOCX n'est pas mentionné dans les instructions), React components d'édition

### Next action

Designer confirme la hiérarchie visuelle et structure HTML avant implémentation.

---

**Navigation**: [[workflows/runs/analyze-design-dev-review-20260602150000/task|Task]] · next [[workflows/runs/analyze-design-dev-review-20260602150000/02-design]]
