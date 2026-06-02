---
tags: [run/analyze-design-dev-review-20260602120000, workflow/analyze-design-dev-review, agent/designer, stage/02]
run: "[[workflows/runs/analyze-design-dev-review-20260602120000/task]]"
workflow_def: "[[workflows/definitions/analyze-design-dev-review]]"
agent: "[[agents/designer/agent]]"
previous_stage: "[[workflows/runs/analyze-design-dev-review-20260602120000/01-analyze]]"
---
# Stage 02 — Design

### Verdict: PASS

### Summary
Le champ raffinement est un textarea sobre placé juste au-dessus du bouton de génération. Pas de nouveau pattern UI — utilisation du `Textarea` déjà importé dans l'éditeur. Style cohérent avec le design token "Papier & Crayon" existant. Trois surfaces UI reçoivent exactement le même traitement visuel.

### Design Decisions

**Composant** : `Textarea` de `@cvforge/ui` (déjà utilisé dans `letter-editor.tsx`). Dans `candidature-detail-tabs.tsx` et `candidatures-slide-over.tsx`, le `Textarea` sera importé directement depuis `@cvforge/ui`.

**Label** : "Raffinement (optionnel)" avec une ligne de description en gris `#6B6860` : _"Précisez votre motivation spécifique pour ce poste. Ce texte enrichit la génération."_

**Placement** :
- Dans `LmTab` : juste avant `<GenerateLetterButton>`, dans le même `div` grid.
- Dans `candidatures-slide-over.tsx` : juste avant `<GenerateLetterButton>`.
- Dans `letter-editor.tsx` : nouvelle `SectionCard` "Régénérer" placée avant l'historique des versions, avec textarea + bouton "Régénérer la LM".

**Dimensions** : `rows={3}`, `maxLength={500}`, compteur de caractères discret sous le champ (`X / 500`).

**Accessibilité** : `<label htmlFor>` associé, placeholder explicite.

**State management** : état local React `useState<string>("")` dans chaque surface. Pas de persistance, réinitialisé à l'ouverture.

### UX Risks
- Aucun risque bloquant. Le champ est optionnel, l'UX existante reste inchangée si laissé vide.
- Risque mineur : sur mobile (slide-over 420px), le textarea ajoute ~80px de hauteur scrollable — acceptable.

---
**Navigation**: [[workflows/runs/analyze-design-dev-review-20260602120000/task|Task]] · prev [[workflows/runs/analyze-design-dev-review-20260602120000/01-analyze]] · next [[workflows/runs/analyze-design-dev-review-20260602120000/03-implement]]
