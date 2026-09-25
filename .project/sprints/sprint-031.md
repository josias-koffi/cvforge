<!-- generated-by: plan « Landing : vitrine complète et pages fonctionnalités » (demande propriétaire 2026-09-25) -->

# Sprint 031 — La landing raconte toute la recherche, une page par fonctionnalité forte

## 🎯 Sprint Goal

Épic **E24 — Landing : vitrine complète et pages fonctionnalités**. La page d'accueil ne parle
que du CV, de la lettre et de l'entretien ; les offres du jour (E19), les entreprises qui recrutent
(E20) et le radar marché (E21) n'y apparaissent pas. Refaire l'accueil autour de toute la recherche
(trouver → postuler → s'entraîner → suivre) et ouvrir quatre pages dédiées, indexables, illustrées
par des captures de l'app.

> ⚠️ Pages marketing sur des fonctionnalités déjà livrées : aucune fonctionnalité produit nouvelle.
> Décision produit du 2026-09-25.

> ⚠️ Ne pas promettre ce qui n'existe pas : pas de kanban (tableau à statuts), un seul modèle de CV
> en v2, rien d'E22 ni d'E14. Prix et coûts lus dans l'API et `AI_CREDIT_COSTS`, jamais en dur.

## ✅ Tasks

- [x] **[US-142]** Socle des pages fonctionnalités
  - Agent: `developer`
  - Critères d'acceptation :
    - [x] Registre `lib/features.ts` lu par l'accueil, la navigation, le pied de page, le sitemap.
    - [x] Slugs FR/EN avec réécriture, redirections et sélecteur de langue fonctionnel.
    - [x] Gabarit commun piloté par les dictionnaires, test de parité FR/EN vert.
    - [x] Métadonnées via `pageMetadata()`, JSON-LD (application, FAQ, fil d'Ariane), image OG par page.
- [x] **[US-143]** Page « Offres du jour » avec le classement IA
  - Critères d'acceptation :
    - [x] Sources, score de correspondance, phrase IA par offre, coût lu dans `AI_CREDIT_COSTS`.
    - [x] Gratuit sans IA dit explicitement ; captures de l'app.
- [x] **[US-144]** Page « CV et lettre sur mesure »
- [x] **[US-145]** Page « Simulation d'entretien »
- [x] **[US-146]** Page « Entreprises qui recrutent et marché »
- [x] **[US-147]** Nouvelle page d'accueil et navigation
  - Critères d'acceptation :
    - [x] Accroche « toute la recherche », parcours en quatre temps reliés aux pages.
    - [x] Section dédiée aux offres du jour, bento en quatre groupes, bande confiance.
    - [x] Menu « Fonctionnalités » dans l'en-tête, colonne dans le pied de page, menu mobile.
- [x] **[US-148]** Captures d'écran v2
  - Critères d'acceptation :
    - [x] Nouveaux écrans : offres du jour, recherche, alertes, entreprises, fiche entreprise,
          radar marché, rapport ATS, en clair et en sombre, depuis le compte de démo uniquement.
    - [x] Captures de détail (composant seul, 3x) pour les gros plans.
