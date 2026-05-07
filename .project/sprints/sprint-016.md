<!-- generated-by: run-workflow designer-product-owner -->

# Sprint 016

## 🎯 Sprint Goal

Refondre la navigation et la gestion des candidatures en desktop-first : sidebar permanente, table filtrée, et écran détail candidature avec onglets.

## 📅 Period

- Start: 2026-11-15
- End: 2026-11-28

## ✅ Tasks (3–8 max)

- [x] **[US-060]** Refondre la navigation en sidebar desktop-first avec drawer mobile
  - Agent: `designer` + `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [x] Sidebar fixe 240px présente sur tous les écrans authentifiés `≥ 1024px`
    - [x] Drawer mobile slide-in présent pour `< 768px` avec hamburger
    - [x] Items nav: Dashboard, Candidatures, Interview, Documents, Crédits, Profil, Notifications, Admin (role-gated)
    - [x] Focus ring visible sur tous les items (WCAG 2.1 AA)
    - [x] Top bar avec breadcrumb + avatar + notification bell
  - Source: vision `§2.5`, `§2.6`

- [x] **[US-061]** Convertir la liste candidatures en table filtrée avec slide-over détail
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [x] Table avec colonnes: Poste, Entreprise, Statut (badge), Date, Score entretien, Actions
    - [x] Barre de filtres: statut, date range, recherche texte
    - [x] Tri par colonne activé (`<th scope="col" aria-sort>`)
    - [x] Clic sur ligne → slide-over preview OU navigation vers `/candidatures/[id]`
    - [x] CTA "Nouvelle candidature" en haut à droite
    - [x] Table paginée (≥ 20 lignes par page)
  - Source: vision `§7`

- [ ] **[US-062]** Créer l'écran détail candidature `/candidatures/[id]` avec onglets
  - Agent: `designer` + `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] Header: titre poste, entreprise, badge statut, date création
    - [ ] Onglets: Offre | CV | LM | Interviews | Historique
    - [ ] Onglet Offre: données scrapées structurées lisibles
    - [ ] Onglet CV: aperçu + actions "Éditer" (→ `/documents/[id]/edit`) et "PDF"
    - [ ] Onglet LM: même traitement que CV
    - [ ] Onglet Interviews: table des sessions passées + bouton "Démarrer un entretien" (→ `/interview/new?candidatureId=…`)
    - [ ] Onglet Historique: timeline des changements de statut
    - [ ] Navigation breadcrumb: Candidatures > [Poste]
  - Source: vision `§7`, `§8`, `§9`, `§10`

## 📊 Sprint DoD

- [ ] All tasks ticked
- [ ] All acceptance criteria verified
- [ ] `run-tests` green
- [ ] Coverage ≥ spec threshold
- [ ] QA review ✅
- [ ] WCAG 2.1 AA vérifié pour la navigation et la table

## 🚧 Risks

- Le slide-over détail peut créer des conflits de routing si Next.js parallel routes ne sont pas configurés — préférer navigation directe `/candidatures/[id]` si nécessaire.
- La table paginée requiert une API avec `?page=&limit=&filters=` — prévoir une migration de l'endpoint `/candidatures`.

## ⚠️ To Clarify

- Confirmer si le slide-over est préféré à la navigation directe (décision UX). -> oui on confirme
