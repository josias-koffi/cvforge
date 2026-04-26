<!-- generated-by: run-workflow designer-product-owner -->

# Sprint 019

## 🎯 Sprint Goal

Finaliser la refonte visuelle : appliquer les tokens shadcn-minimal à toute l'app, refondre la page Crédits avec table ledger, et refondre la page Profil avec accordions et switcher multi-profil.

## 📅 Period

- Start: 2026-12-27
- End: 2027-01-09

## ✅ Tasks (3–8 max)

- [ ] **[US-071]** Appliquer le design token shadcn-minimal à l'ensemble de l'app
  - Agent: `designer` + `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] Palette appliquée: `#fafafa` background, `#ffffff` cards, `#e5e7eb` borders, `#18181b` text, `#71717a` muted
    - [ ] Font stack: Inter ou Geist sur toutes les pages
    - [ ] Cards: `rounded-lg border shadow-sm px-6 py-5` appliqué uniformément
    - [ ] Tous les anciens tokens "Papier & Crayon" remplacés ou compatibilisés dans `packages/ui/tokens`
    - [ ] Rapport de contraste WCAG 2.1 AA vérifié (≥ 4.5:1 pour le texte)
    - [ ] Aucune régression visuelle sur les pages déjà livrées (snapshot ou QA manuel)
  - Source: vision `§2.6`

- [ ] **[US-072]** Refondre la page Crédits avec table ledger et cards packs
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] Balance card grande et proéminente en haut (solde actuel en gros)
    - [ ] Alerte solde bas visible si `isLowBalance = true`
    - [ ] Cards packs en ligne: Starter (9,99€ / 550 crédits) et Pro (19,99€ / 1400 crédits)
    - [ ] Table ledger: colonnes Date, Action, Montant (+ ou −), Solde après opération
    - [ ] Table triée par date décroissante, paginée
    - [ ] Design conforme au token shadcn-minimal
  - Source: vision `§11`

- [ ] **[US-073]** Refondre la page Profil: accordions par section + switcher multi-profil
  - Agent: `designer` + `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] Colonne gauche étroite (240px): liste des profils avec profil actif mis en évidence
    - [ ] Colonne droite principale: formulaire du profil actif
    - [ ] Sections du profil en accordions: Identité, Expériences, Formation, Compétences, Langues, Préférences
    - [ ] Action "Importer un CV" accessible dans l'accordion Identité
    - [ ] Chaque accordion se ferme après sauvegarde
    - [ ] Bouton "Nouveau profil" dans la colonne gauche
    - [ ] Switcher profil: clic → formulaire droit se recharge sans rechargement de page
  - Source: vision `§5`, `§5.1`

## 📊 Sprint DoD

- [ ] All tasks ticked
- [ ] All acceptance criteria verified
- [ ] `run-tests` green
- [ ] Coverage ≥ spec threshold
- [ ] QA review ✅
- [ ] E15 entièrement livré (sprints 016–019 complétés)
- [ ] Rapport de contraste WCAG 2.1 AA passé sur toutes les pages refondues

## 🚧 Risks

- US-071: la migration des tokens peut introduire des régressions sur les pages existantes non refondues — tester systématiquement avec des snapshots visuels.
- US-073: le rechargement du formulaire sans navigation doit éviter la perte de données non sauvegardées — prévoir une confirmation de sortie ou auto-save.

## ⚠️ To Clarify

- Valider si les tokens "Papier & Crayon" sont entièrement abandonnés ou partiellement gardés pour les documents (CV/LM imprimables).
