---
tags:
  [
    run/analyze-design-dev-review-20260602150000,
    workflow/analyze-design-dev-review,
  ]
workflow_def: "[[workflows/definitions/analyze-design-dev-review]]"
---

# Task — améliorer la génération de CV (mise en forme + contenu)

**Type:** Ad hoc — amélioration qualité
**Run ID:** analyze-design-dev-review-20260602150000
**Date:** 2026-06-02

## Description

L'utilisateur a fourni un cahier d'instructions détaillé pour améliorer le générateur de CV sur deux axes :

### 🔧 MISE EN FORME

**Marges**

- 2,5 cm gauche/droite et 2 cm haut/bas (min 1,8 cm)

**En-tête**

- Nom : 22-26pt, gras, noir profond
- Titre : une seule ligne, 10-11pt, 6-8 mots max
- Coordonnées : une ligne, séparées par "·", 9-10pt
- Filet horizontal fin sous l'en-tête

**Titres de section**

- Petites capitales ou gras, 9-10pt
- Espacement avant section : 8-10pt
- Filet séparateur pleine largeur
- Même taille/style pour toutes les sections

**Dates**

- Format : "Mois. AAAA – Mois. AAAA" (ex. Jan. 2022 – Oct. 2024)
- Poste en cours : "Jan. 2024 – Présent"
- Alignées à droite, même ligne que le titre du poste

**Typographie**

- Police serif (Garamond, Georgia) ou sans-serif (Inter, Calibri)
- Corps : 10-10,5pt ; interligne : 1,15 ; espacement paragraphes : 6-8pt

**Hiérarchie visuelle des expériences**

- Titre du poste — gras, 10,5-11pt
- Nom entreprise — regular ou italique, même taille
- Bullets — regular, légèrement indenté

**Compétences**

- Hard skills et soft skills en 2 blocs distincts
- Puces courtes 2-4 mots, max 8-10 items par bloc

**Outils/Logiciels**

- Sous-section dédiée séparée des compétences générales
- Listés par catégorie si nombreux

**Langues**

- Format : "Langue — Niveau certifié / Descriptif" (ex. Anglais — C1 / Courant)
- Jamais seulement "Courant" sans niveau

**Espacement global**

- Blanc 6-8pt entre expériences
- La page ne doit jamais paraître "pleine"

### ✍️ CONTENU (prompt AI)

**Profil/Accroche**

- Ne JAMAIS commencer par "Je suis" ou "Étudiant(e) en"
- Commencer par le titre métier ou la compétence principale
- Structure : [Profil] + [X ans d'expérience] + [domaine] + [valeur apportée]
- 4-6 lignes max, pas de bullet points
- Terminer sur ce que le candidat APPORTE, pas sur ce qu'il cherche

**Titre de poste en en-tête**

- Correspondre exactement au poste visé dans l'offre

**Expériences**

- Phrase de contexte obligatoire (secteur, taille, portée géo)
- 3-5 bullets max par poste
- Chaque bullet : verbe d'action fort (Piloté, Créé, Lancé…)
- Chaque bullet : résultat ou métrique (%, nombre, volume…)

**Formation**

- 3 formations les plus récentes en détail
- Diplômes antérieurs condensés sur une ligne
- Niveau RNCP ou équivalent si disponible
- Corriger fautes d'orthographe dans les intitulés

**Cohérence globale**

- Titre, accroche, mots-clés expériences, compétences → même poste cible

**Ce qu'il ne faut JAMAIS faire**

- Compétences en un seul paragraphe non structuré
- Dates au format AAAA-MM
- Titre trop long
- Profil commençant par "Je"
- Outils noyés dans les compétences générales

## Files concernés

- `apps/api/src/cv-generation/cv-pdf-styles.ts` — marges, typographie globale
- `apps/api/src/cv-generation/cv-html-templates.ts` — structure HTML CV PDF, mise en forme sections
- `apps/api/src/cv-generation/cv-generation.service.ts` — prompts AI CV et LM
