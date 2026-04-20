<!-- generated-by: run-agent analyst -->

# Sprint 003

## 🎯 Sprint Goal

Sécuriser l'accès produit avec l'authentification passwordless, le bootstrapping admin et les protections par rôles requises pour le MVP (source: vision `§3`, `§13.1`, `§16`).

## 📅 Period

- Start: 2026-05-16
- End: 2026-05-30

## ✅ Tasks (3–8 max)

- [x] **[US-009]** Implémenter l'auth passwordless et les sessions sécurisées
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [x] Le login passwordless fonctionne de bout en bout
    - [x] Les sessions sont persistées de manière sécurisée
    - [x] La durée de session est documentée, même si le réglage final reste à préciser
  - Source: vision `§3.1`, `§3.4`, `§16`
- [x] **[US-010]** Sécuriser le bootstrapping du premier admin
  - Agent: `tech-lead`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [x] Le premier compte créé reçoit le rôle `admin`
    - [x] Le mécanisme est désactivé définitivement après création du premier admin
    - [x] Une inscription publique ultérieure ne peut jamais créer d'admin
  - Source: vision `§3.2`, `§16`
- [x] **[US-011]** Ajouter les invitations admin/user à usage unique avec expiration 48h
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [x] Un admin peut générer un lien d'invitation nominatif
    - [x] Le lien n'est consommable qu'une seule fois
    - [x] Le lien expire après 48h
  - Source: vision `§3.2`, `§13.2`, `§16`
- [x] **[US-012]** Protéger les routes par rôles, dont `/admin`
  - Agent: `qa-reviewer`
  - Workflow: `bug-triage`
  - Acceptance criteria:
    - [x] Les routes admin sont inaccessibles aux `user`
    - [x] Les routes protégées exigent une session valide
    - [x] Les contrôles d'autorisation sont testés
  - Source: vision `§3.3`, `§13.1`, `§16`

## 📊 Sprint DoD

- [x] All tasks ticked
- [x] All acceptance criteria verified
- [x] `run-tests` green
- [x] Coverage ≥ spec threshold
- [x] QA review ✅

## 🚧 Risks

- Le choix final de la durée de session reste à verrouiller.
- Le flux d'invitation doit rester cohérent avec le futur panel admin.

## ⚠️ To Clarify (sprint blockers)

- None.
