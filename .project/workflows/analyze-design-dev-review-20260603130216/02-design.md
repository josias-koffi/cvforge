---
tags: [run/analyze-design-dev-review-20260603130216, workflow/analyze-design-dev-review, agent/designer, stage/02]
run: "[[workflows/runs/analyze-design-dev-review-20260603130216/task]]"
workflow_def: "[[workflows/definitions/analyze-design-dev-review]]"
agent: "[[agents/designer/agent]]"
previous_stage: "[[workflows/runs/analyze-design-dev-review-20260603130216/01-analyze]]"
---
### Verdict: PASS
### Summary (≤ 100 words)
Ajouter le suivi dans l'en-tête existant de la candidature : badge de statut courant, select "Suivi de candidature", bouton "Mettre à jour", puis feedback discret sous le contrôle. Le ton reste "Papier & Crayon" : surface blanche, bordures fines, typographie sobre, pas de nouvelle carte imbriquée.
### Findings
- [ADVISORY] Si aucune transition n'est disponible, afficher "Suivi finalisé" au lieu d'un select désactivé difficile à comprendre.
### Developer brief
- Réutiliser les labels et transitions existants.
- Garder le contrôle keyboard-accessible avec `label`, `select`, bouton submit.
- Ajouter `returnTo=/candidatures/{id}` au formulaire.
### Next action
Implémenter sans changer le contrat backend.
---
**Navigation**: [[workflows/runs/analyze-design-dev-review-20260603130216/task|Task]] · prev [[workflows/runs/analyze-design-dev-review-20260603130216/01-analyze]] · next [[workflows/runs/analyze-design-dev-review-20260603130216/03-implement]]
