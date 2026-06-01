# Task — ad hoc (2026-06-01)

**Workflow**: analyze-design-dev-review  
**Run ID**: analyze-design-dev-review-20260601100000  
**Source**: ad hoc

## Task description

Le rendu PDF du CV par défaut et de la lettre de motivation est insatisfaisant :
1. **Fond coloré** : les deux templates retournent un fond crème (`#f6f3ed`) au lieu d'un fond blanc (`#ffffff`).
2. **Dépassement de page** : le contenu ne tient pas sur une seule page A4 — les interlignes et espacements doivent être réduits au maximum.

Des modèles de référence sont fournis dans `/tmp/` :
- `EGLA_Jemima_Alternance_AssistanteVisualMerchandiser_Longchamp.docx.pdf` — modèle CV
- `EGLA_Jemima_Alternance_LettreMotivation_VisualMerchandiser_Longchamp.docx.pdf` — modèle LM

Le modèle de référence montre :
- Fond blanc pur
- Texte noir, accents rouge foncé (`#b22222`) pour les en-têtes de section et la ligne de séparation
- Titre du candidat en rouge sous le nom
- Layout compact, une page A4

## Files concerned

- `apps/api/src/cv-generation/cv-pdf-export.service.ts` (840 lignes — doit être découpé §9)
- `apps/api/src/cv-generation/cv-pdf-export.service.test.ts` (à vérifier après refacto)
