<!-- generated-by: plan « Cockpit admin /admin/metrics » (demande propriétaire 2026-09-25) -->

# Sprint 033 — Piloter l'activité depuis un vrai cockpit

## 🎯 Sprint Goal

Épic **E26 — Cockpit de pilotage admin**. `/admin/metrics` n'était qu'une grille de cartes, le
plus souvent en cumul depuis le lancement, sans graphique ni période. Le coût d'une génération
était inconnu (seule la dépense totale du compte OpenRouter l'était) et aucune recherche n'était
enregistrée. Le cockpit sépare les responsabilités en onglets, compare chaque période à la
précédente, trace les tendances et fait remonter des insights.

## ✅ Tasks

- [x] **[US-154]** Journal des coûts IA
  - Agent: `developer`
  - Critères d'acceptation :
    - [x] Migration 0046 idempotente : table `ai_usage_events`, sans donnée personnelle.
    - [x] Chaque appel texte, voix et transcription enregistre sa fonctionnalité, le modèle qui a
          répondu, les tokens et le coût `usage.cost` d'OpenRouter ; un échec est enregistré à 0.
    - [x] Une écriture ratée ne fait jamais échouer l'appel.
- [x] **[US-155]** Journal des recherches des outils gratuits
  - Critères d'acceptation :
    - [x] Entreprise trouvée (SIREN) et métier × département comptés par jour, sans IP.
    - [x] Purge au-delà de 365 jours avec la purge d'acquisition.
- [x] **[US-156]** API cockpit par domaine
  - Critères d'acceptation :
    - [x] `GET /admin/metrics/{overview,revenue,ai-costs,usage,market,acquisition}?period=`,
          réservées aux admins.
    - [x] Séries complétées de zéros ; écart avec la période précédente ; insights à seuils nommés.
    - [x] Types partagés dans `@cvforge/types` ; export CSV sur la période.
- [x] **[US-157]** Cockpit web : onglets, période, vue d'ensemble, insights
  - Critères d'acceptation :
    - [x] Onglets en sous-routes ; `?periode=` conservée par les onglets et l'export CSV.
    - [x] Indicateurs avec leur écart à la période précédente, masqué sans comparaison.
    - [x] Panneau « À retenir » avec lien vers l'onglet qui explique chaque insight.
- [x] **[US-158]** Onglets Revenus & conversion et Coûts IA
  - Critères d'acceptation :
    - [x] Entonnoir de conversion, ventes par pack, crédits entrés et sortis.
    - [x] Coût par usage (graphique empilé), économie unitaire, tableau par modèle, autonomie du
          solde OpenRouter (« plus d'un an » au-delà de 365 jours).
- [x] **[US-159]** Onglets Produit, Marché et Acquisition ; retrait de l'ancienne grille
  - Critères d'acceptation :
    - [x] Classements entreprises et postes (candidatures, recherches, outils gratuits).
    - [x] Rétention par cohorte, modèles utilisés, scores ATS par version du barème.
    - [x] « Métriques » devient « Pilotage » ; ancienne grille et `lib/metrics.ts` supprimés.

## Vérification

- Lint, types et tests verts : API 2 066 tests (dont le SQL de chaque onglet sur PGlite, base
  vide et remplie), web 514 tests.
- Migration 0046 appliquée en local ; parcours des onglets dans le navigateur (desktop).
- Bout en bout : une vérification d'entreprise sur l'outil public crée sa ligne dans
  `tool_queries` ; un appel IA réel (questions d'entretien) enregistre modèle, tokens et coût
  (0,000103 $) dans `ai_usage_events`, puis apparaît dans l'onglet Coûts IA.
- Non vérifié : rendu à 390 px et en thème sombre (le navigateur n'a pas pu être redimensionné).
