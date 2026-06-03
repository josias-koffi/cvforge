---
tags:
  [
    run/analyze-design-dev-review-20260602140000,
    workflow/analyze-design-dev-review,
  ]
workflow_def: "[[workflows/definitions/analyze-design-dev-review]]"
---

# Task — Améliorer le générateur de lettres de motivation

**Source**: ad hoc  
**Date**: 2026-06-02

## Description

Appliquer toutes les instructions de formatage et de contenu pour améliorer la lettre de motivation générée par CVForge.

## Instructions complètes

### 🔧 Mise en forme — corrections prioritaires

1. **Marges** : 2,5 cm gauche/droite, 2 cm haut/bas dans le PDF (actuellement 10mm)
2. **En-tête** : nom en `#1a1a1a`; coordonnées sur une ligne séparées par `·`; titre du poste en italique sous les coordonnées (absent du rendu React actuel)
3. **Espacement** : réduire l'espace entre le bloc destinataire et la ligne Objet (≤ 3 lignes vides)
4. **Corps** : texte justifié (conserver)
5. **Signature** : ajouter la ville + date juste au-dessus du nom de signature (ex. "Neuville sur Oise, le 2 juin 2025"); formule de politesse incluse dans le dernier paragraphe par l'IA

### ✍️ Contenu — améliorations du prompt IA

1. **Paragraphe d'ouverture** : scinder en deux phrases; mettre en avant ce que le candidat apporte en premier
2. **Paragraphes d'expériences** : passer de 1 à 2 paragraphes distincts (digital/NETIS Group + retail/activation terrain)
3. **Métriques** : demander à l'IA d'intégrer des chiffres concrets quand disponibles
4. **Clôture** : personnaliser avec un élément spécifique à l'entreprise cible
5. **Formule de politesse** : inclure dans le dernier paragraphe IA ("Veuillez agréer, Madame, Monsieur, l'expression de mes salutations distinguées.")

### ✅ Ce qui fonctionne (à conserver)

- Structure en 3+ paragraphes bien identifiés
- Ligne "Objet" en gras
- Ton professionnel et dynamique
- Cohérence titre candidat ↔ poste visé

## Scope

- `packages/types/src/index.ts` — ajouter `paragraph4?: string` à `LMBodyProps`
- `packages/ui/src/document-blocks.tsx` — `LMHeader` (titre italic), `LMBody` (paragraph4)
- `apps/api/src/cv-generation/cv-html-templates.ts` — marges, espacement, signature, paragraph4
- `apps/api/src/cv-generation/cv-docx-templates.ts` — paragraph4, date avant signature
- `apps/api/src/cv-generation/cv-generation.service.ts` — `LETTER_SYSTEM_PROMPT` (4 paragraphes, métriques, politesse)
- `apps/app/app/letters/[applicationId]/letter-editor.tsx` — champ paragraph4
- `apps/app/app/letters/[applicationId]/letter-document-preview.tsx` — ville+date avant signature
