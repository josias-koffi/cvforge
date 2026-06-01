# Stage 1 — Analyze
**Agent**: product-owner  
**Run**: analyze-design-dev-review-20260601100000

### Verdict: PASS

### Summary
Le problème est clairement borné : deux bugs CSS dans `cv-pdf-export.service.ts` (840 lignes, au-dessus du seuil warning §9). La couleur de fond crème `#f6f3ed` doit devenir `#ffffff`. Les interlignes et espacements doivent être réduits pour tenir sur une page A4. Les modèles de référence dans `/tmp/` définissent le rendu cible : fond blanc, accents rouge foncé, layout compact une page.

### Findings
- Scope clair : fix CSS `renderCvPdfHtml` + `renderLetterPdfHtml` + refacto §9 du fichier 840 lignes.
- Aucun critère d'acceptation sprint existant — tâche ad hoc.
- Modèles de référence disponibles et lisibles.

### Acceptance criteria
1. Le PDF CV exporté a un fond blanc (`#ffffff`), aucune couleur de fond crème.
2. Le PDF lettre de motivation exporté a un fond blanc (`#ffffff`).
3. Un CV de densité standard (profil + 2-3 expériences + formation + compétences) tient sur une seule page A4.
4. Une lettre de motivation de densité standard tient sur une seule page A4.
5. `cv-pdf-export.service.ts` est découpé sous 400 lignes (seuil warning §9).
6. Les tests existants passent sans modification de leurs assertions.

### Next action
Designer confirme la direction visuelle puis developer implémente.
