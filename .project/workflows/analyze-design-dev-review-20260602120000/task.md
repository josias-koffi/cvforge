---
tags: [run/analyze-design-dev-review-20260602120000, workflow/analyze-design-dev-review]
workflow_def: "[[workflows/definitions/analyze-design-dev-review]]"
---
# Task — Champ Raffinement pour la Génération de LM

## Description
Dans l'app au niveau de la lettre de motivation, ajouter un champ "Raffinement" : un textarea libre que l'utilisateur peut remplir avant de générer la LM pour mieux cerner sa motivation (ex. "Je suis particulièrement attiré par leur approche open-source"). Ce texte enrichit le prompt envoyé à l'IA lors de la génération.

Le champ doit être ajouté à **trois endroits** :
1. `candidatures/[id]` → `LmTab` dans `candidature-detail-tabs.tsx` (avant le bouton "Générer la LM")
2. `candidatures/` → `candidatures-slide-over.tsx` (avant le bouton "Générer la LM")
3. `letters/[applicationId]/letter-editor.tsx` → zone de régénération (si présente) ou nouveau bouton "Régénérer avec raffinement"

## Stack concernée
- Frontend : Next.js (`apps/app`)
- Backend : NestJS (`apps/api`)
- Types partagés : `packages/types`

## Fichiers clés identifiés
- `packages/types/src/index.ts` — `LetterGenerationRequest` = `CvGenerationRequest` (à étendre)
- `apps/app/app/candidatures/generate-letter-button.tsx` — bouton de génération (à ajouter prop `refinement`)
- `apps/app/app/candidatures/generate-letter/route.ts` — proxy Next.js vers l'API
- `apps/api/src/cv-generation/cv-generation.controller.ts` — endpoint `POST /:id/generate-letter`
- `apps/api/src/cv-generation/cv-generation.service.ts` — `generateLetter()` + `LETTER_SYSTEM_PROMPT`
- `apps/app/app/candidatures/candidatures-slide-over.tsx` — slide-over (endroit 1)
- `apps/app/app/candidatures/[id]/candidature-detail-tabs.tsx` — `LmTab` (endroit 2)
- `apps/app/app/letters/[applicationId]/letter-editor.tsx` — éditeur LM (endroit 3)
