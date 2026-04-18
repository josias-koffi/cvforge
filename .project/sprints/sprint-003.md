<!-- generated-by: run-agent analyst -->

# Sprint 003

## 🎯 Sprint Goal

Sécuriser l'accès produit avec l'authentification passwordless, le bootstrapping admin et les protections par rôles requises pour le MVP (source: vision `§3`, `§13.1`, `§16`).

## 📅 Period

- Start: 2026-05-16
- End: 2026-05-30

## ✅ Tasks (3–8 max)

- [ ] **[US-009]** Implémenter l'auth passwordless et les sessions sécurisées
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] Le login passwordless fonctionne de bout en bout
    - [ ] Les sessions sont persistées de manière sécurisée
    - [ ] La durée de session est documentée, même si le réglage final reste à préciser
  - Source: vision `§3.1`, `§3.4`, `§16`
- [ ] **[US-010]** Sécuriser le bootstrapping du premier admin
  - Agent: `tech-lead`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] Le premier compte créé reçoit le rôle `admin`
    - [ ] Le mécanisme est désactivé définitivement après création du premier admin
    - [ ] Une inscription publique ultérieure ne peut jamais créer d'admin
  - Source: vision `§3.2`, `§16`
- [ ] **[US-011]** Ajouter les invitations admin/user à usage unique avec expiration 48h
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] Un admin peut générer un lien d'invitation nominatif
    - [ ] Le lien n'est consommable qu'une seule fois
    - [ ] Le lien expire après 48h
  - Source: vision `§3.2`, `§13.2`, `§16`
- [ ] **[US-012]** Protéger les routes par rôles, dont `/admin`
  - Agent: `qa-reviewer`
  - Workflow: `bug-triage`
  - Acceptance criteria:
    - [ ] Les routes admin sont inaccessibles aux `user`
    - [ ] Les routes protégées exigent une session valide
    - [ ] Les contrôles d'autorisation sont testés
  - Source: vision `§3.3`, `§13.1`, `§16`

## 📊 Sprint DoD

- [ ] All tasks ticked
- [ ] All acceptance criteria verified
- [ ] `run-tests` green
- [ ] Coverage ≥ spec threshold
- [ ] QA review ✅

## 🚧 Risks

- Le choix final de la durée de session reste à verrouiller.
- Le flux d'invitation doit rester cohérent avec le futur panel admin.

## ⚠️ To Clarify (sprint blockers)

- Durée de session finale à arrêter pendant l'implémentation (source: vision `§3.4`).
