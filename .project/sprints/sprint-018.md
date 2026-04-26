<!-- generated-by: run-workflow designer-product-owner -->

# Sprint 018

## 🎯 Sprint Goal

Refondre les surfaces documentaires et l'éditeur admin : Documents Hub avec table, formulaire structuré pour les utilisateurs (sans Puck), Puck full-screen admin-only, et dashboard épuré.

## 📅 Period

- Start: 2026-12-13
- End: 2026-12-26

## ✅ Tasks (3–8 max)

- [ ] **[US-067]** Créer le Documents Hub `/documents` avec table CV/LM
  - Agent: `designer` + `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] Table avec colonnes: Titre, Type (CV/LM badge), Candidature liée, Dernière modif, Actions
    - [ ] Actions par ligne: PDF, DOCX, Éditer (→ `/documents/[id]/edit`)
    - [ ] Filtre par type: CV / LM / Tous
    - [ ] Tri par date de modification
    - [ ] Aucun éditeur Puck dans cette page
  - Source: vision `§6`, `§8`, `§9`

- [ ] **[US-068]** Remplacer l'éditeur document utilisateur par un formulaire structuré
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] La page `/documents/[id]/edit` affiche un formulaire structuré (pas Puck) côté user
    - [ ] Sections du formulaire: Identité, Résumé, Expériences, Formation, Compétences, Langues
    - [ ] Aperçu rendu à gauche (read-only) mis à jour à la sauvegarde
    - [ ] Actions: "Télécharger PDF" et "Télécharger DOCX" dans le header
    - [ ] Le composant Puck n'est pas chargé côté user (bundle split)
    - [ ] ⚠️ Décision produit validée: vision §8 mentionne WYSIWYG Puck pour user — cette story le remplace par formulaire structuré pour V2.1
  - Source: vision `§8`

- [ ] **[US-069]** Passer l'éditeur Puck admin en mode full-screen viewport
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] La route `/admin/templates/[id]/edit` rend Puck en plein écran (pas de sidebar, pas de shell header)
    - [ ] Barre minimale en haut: nom du template + "Sauvegarder" + "← Retour aux templates"
    - [ ] Puck occupe `100vw × 100vh`
    - [ ] Accessible uniquement aux utilisateurs avec rôle `admin`
    - [ ] Redirection 403 si un `user` accède directement à la route
  - Source: ADR-003, vision `§6.7`, `§13.3`

- [ ] **[US-070]** Refondre le Dashboard: 3 KPI + 2 tables récentes + quick actions
  - Agent: `designer` + `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] 3 KPI cards en ligne: candidatures actives, crédits restants, prochaine interview
    - [ ] Table "Candidatures récentes" (5 dernières, colonnes: Poste, Statut, Date)
    - [ ] Table "Sessions entretien récentes" (5 dernières, colonnes: Candidature, Score, Date)
    - [ ] Panneau quick actions: "Nouvelle candidature", "Commencer un entretien", "Acheter des crédits"
    - [ ] Maximum 2 graphiques (optionnels, masquables)
    - [ ] Responsive: stacked sur mobile, 2-col sur tablet, 3-col sur desktop
  - Source: vision `§12.1`–`§12.4`

## 📊 Sprint DoD

- [ ] All tasks ticked
- [ ] All acceptance criteria verified
- [ ] `run-tests` green
- [ ] Coverage ≥ spec threshold
- [ ] QA review ✅
- [ ] Gate: aucune surface Puck côté user vérifiée par bundle analysis

## 🚧 Risks

- US-068: retirer Puck de l'éditeur user peut casser des documents existants générés avec un layout Puck — prévoir une migration lecture-seule pour les anciens documents.
- US-069: le layout full-screen rompt avec le shell Next.js existant — utiliser un layout dédié `(puck-admin)` pour cette route.

## ⚠️ To Clarify

- Confirmer la décision produit US-068 (formulaire structuré vs Puck user) avant implémentation.
- Comportement des documents existants avec layout Puck après US-068 (migration ou read-only legacy).
