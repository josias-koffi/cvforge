---
tags: [run/analyze-design-dev-review-20260602120000, workflow/analyze-design-dev-review, agent/product-owner, stage/01]
run: "[[workflows/runs/analyze-design-dev-review-20260602120000/task]]"
workflow_def: "[[workflows/definitions/analyze-design-dev-review]]"
agent: "[[agents/product-owner/agent]]"
---
# Stage 01 — Analyze

### Verdict: PASS

### Summary
Ajout d'un champ "Raffinement" (textarea optionnel) à la génération de lettre de motivation. L'utilisateur saisit un texte libre (ex. "Je suis passionné par leur culture open-source") avant génération — ce texte est injecté dans le prompt IA pour personnaliser davantage la lettre. Scope clairement délimité : 3 surfaces UI + chaîne backend (type → route proxy → service NestJS + prompt).

### Acceptance Criteria
1. **AC-1** : Un textarea "Raffinement (optionnel)" est visible dans `LmTab` de `candidature-detail-tabs.tsx`, au-dessus du bouton "Générer la LM".
2. **AC-2** : Le même textarea apparaît dans `candidatures-slide-over.tsx`, au-dessus du bouton "Générer la LM".
3. **AC-3** : Dans `letter-editor.tsx`, un textarea + bouton "Régénérer avec raffinement" sont présents.
4. **AC-4** : Le texte de raffinement est transmis à l'API (type `LetterGenerationRequest` étendu avec `refinement?: string`).
5. **AC-5** : Le `LETTER_SYSTEM_PROMPT` est mis à jour pour utiliser le champ `refinement` lorsqu'il est fourni.
6. **AC-6** : Le champ est optionnel — la génération sans raffinement reste identique au comportement actuel.
7. **AC-7** : Le texte de raffinement n'est pas persisté côté serveur (pas de migration de schéma requise).

### Missing product questions
- Limite de caractères pour le champ ? (suggestion : 500 chars max avec compteur)
- Le champ doit-il être pré-rempli si un raffinement précédent existe ? → Non, stateless.

### Scope
- **In scope** : extension du type, 3 surfaces UI, route proxy, prompt enrichment.
- **Out of scope** : persistance du raffinement, historique des raffinements, import/export.

---
**Navigation**: [[workflows/runs/analyze-design-dev-review-20260602120000/task|Task]] · next [[workflows/runs/analyze-design-dev-review-20260602120000/02-design]]
