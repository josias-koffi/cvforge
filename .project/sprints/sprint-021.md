<!-- generated-by: run-workflow analyst-designer (analyst-designer-20260709205519) -->

# Sprint 021

## 🎯 Sprint Goal

Rationalisation UI/UX desktop-first (2/2) — écrans documentaires et administratifs : CV, Letters, Credits, Profile, Admin. Absorbe et remplace US-067, US-068, US-069, US-071 (partiel), US-072, US-073 de sprint 018/019, adaptés à la direction "Papier & Crayon raffiné" (`.project/designs/frontend-rationalization-20260709.md`) — pas de palette shadcn-minimal générique, pas de route `/documents`.

## 📅 Period

- Start: 2026-07-27
- End: 2026-08-09

## ✅ Tasks (3–8 max)

- [ ] **[US-078]** Refondre `/cv` : table des CV + éditeur formulaire/aperçu
  - Agent: `designer` + `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] `/cv` liste en table : Titre, Candidature liée, Dernière modif, Actions (PDF, DOCX, Éditer)
    - [ ] Filtre et tri par date de modification
    - [ ] `/cv/[applicationId]` : formulaire structuré à gauche, aperçu sticky à droite (pas de Puck côté user)
    - [ ] Aucune nouvelle route `/documents` créée
    - [ ] Composant Puck non chargé dans le bundle user (vérifié par bundle analysis)
  - Source: absorbe US-067/068 (adaptées), vision `§6`, `§8`, `§9`

- [ ] **[US-079]** Refondre `/letters` : table des LM + éditeur formulaire/aperçu
  - Agent: `designer` + `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] `/letters` liste en table, même gabarit que `/cv` (Titre, Candidature, Dernière modif, Actions)
    - [ ] `/letters/[applicationId]` : formulaire structuré + aperçu sticky, cohérent avec `/cv/[applicationId]`
    - [ ] Aucune nouvelle route `/documents` créée
  - Source: miroir US-078, vision `§9`

- [ ] **[US-080]** Refondre `/credits` : balance proéminente + table ledger
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] Balance card grande en haut, alerte solde bas si `isLowBalance = true`
    - [ ] Cards packs en ligne (Starter 9,99€/550 crédits, Pro 19,99€/1400 crédits)
    - [ ] Table ledger : Date, Action, Montant (+/−), Solde après opération — triée décroissante, paginée
    - [ ] Tokens `design-system.ts` réutilisés (pas de palette shadcn-minimal)
  - Source: reprend US-072 (sprint 019), vision `§11`

- [ ] **[US-081]** Refondre `/profile` : colonne profils + accordions
  - Agent: `designer` + `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] Colonne gauche 240px : liste des profils, profil actif mis en évidence, bouton "Nouveau profil"
    - [ ] Colonne droite : accordions Identité, Expériences, Formation, Compétences, Langues, Préférences
    - [ ] Import CV accessible dans l'accordion Identité
    - [ ] Switch de profil sans rechargement de page ; confirmation si données non sauvegardées
    - [ ] Chaque accordion se ferme après sauvegarde
  - Source: reprend US-073 (sprint 019), vision `§5`, `§5.1`

- [ ] **[US-082]** Refondre `/admin` : table utilisateurs desktop + finaliser Puck full-screen
  - Agent: `designer` + `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] `/admin` : cards utilisateurs remplacées par une table (email, rôle, solde, dernière activité, actions), filtre conservé
    - [ ] Formulaire d'octroi de crédits (note obligatoire) accessible en ligne ou en panneau latéral, sans page dédiée
    - [ ] `/admin/templates/[id]/edit` en Puck plein écran (`100vw × 100vh`), layout dédié sans shell, admin-only, redirection 403 si `user`
    - [ ] `/admin/templates` (librairie + création) inchangé dans sa structure
  - Source: reprend US-069 (sprint 018), ajoute la table utilisateurs, vision `§6.7`, `§13.3`, ADR-003

## 📊 Sprint DoD

- [ ] All tasks ticked
- [ ] All acceptance criteria verified
- [ ] `run-tests` green
- [ ] Coverage ≥ spec threshold
- [ ] QA review ✅
- [ ] Gate : aucune surface Puck côté user (bundle analysis)
- [ ] Rapport de contraste WCAG 2.1 AA passé sur les 5 écrans
- [ ] E15 (refonte UX) entièrement livré (sprints 016, 020, 021)

## 🚧 Risks

- US-078/079 : retirer Puck de l'éditeur user peut casser des documents existants générés avec un layout Puck — prévoir migration lecture-seule pour les anciens documents (risque déjà identifié en sprint 018).
- US-081 : le switch de profil sans navigation doit éviter la perte de données non sauvegardées.

## ⚠️ To Clarify

- Aucune — voir `.project/workflows/analyst-designer-20260709205519/` pour l'audit complet.
