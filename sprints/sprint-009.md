<!-- generated-by: run-agent analyst -->

# Sprint 009

## 🎯 Sprint Goal

Clôturer le MVP avec les opérations admin, les notifications de base et les exigences RGPD critiques avant lancement commercial (source: vision `§13`, `§14`, `§15`, `§16`).

## 📅 Period

- Start: 2026-08-08
- End: 2026-08-22

## ✅ Tasks (3–8 max)

- [ ] **[US-033]** Développer le panel admin utilisateurs et crédits
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] La liste et la fiche utilisateur sont disponibles
    - [ ] L'admin peut attribuer des crédits avec note
    - [ ] L'admin peut désactiver ou supprimer un compte
  - Source: vision `§13.2`, `§16`
- [ ] **[US-034]** Finaliser les opérations avancées de gestion des templates admin
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] Activation/désactivation et suppression sont gérées
    - [ ] Une vérification empêche la suppression dangereuse
    - [ ] La vue admin couvre les besoins du MVP
  - Source: vision `§13.3`, `§16`
- [ ] **[US-035]** Mettre en place le centre de notifications et les rappels de base
  - Agent: `product-owner`
  - Workflow: `none`
  - Acceptance criteria:
    - [ ] Les notifications in-app critiques existent
    - [ ] Les rappels de relance et entretien sont prévus dans le centre
    - [ ] Les préférences utilisateur sont cadrées pour `V1.1`
  - Source: vision `§12.4`, `§14`, `§16`
- [ ] **[US-036]** Traiter les exigences RGPD critiques avant lancement commercial
  - Agent: `tech-lead`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] Les exports d'accès/portabilité sont cadrés
    - [ ] La suppression RGPD est implémentée ou bloquée explicitement au lancement
    - [ ] Les durées de conservation critiques sont documentées
  - Source: vision `§15.1`, `§15.5`, `§16`

## 📊 Sprint DoD

- [ ] All tasks ticked
- [ ] All acceptance criteria verified
- [ ] `run-tests` green
- [ ] Coverage ≥ spec threshold
- [ ] QA review ✅

## 🚧 Risks

- Toute dette RGPD non résolue bloque la commercialisation du MVP.
- Les opérations destructives admin exigent une validation d'autorisation stricte.

## ⚠️ To Clarify (sprint blockers)

- Désigner un responsable de traitement et statuer sur le besoin d'un DPO avant mise en vente (source: vision `§15.5`).
