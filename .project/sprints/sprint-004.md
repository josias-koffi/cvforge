<!-- generated-by: run-agent analyst -->

# Sprint 004

## 🎯 Sprint Goal

Rendre l'onboarding et le profil candidat exploitables pour alimenter ensuite les pipelines IA du MVP en respectant la pseudonymisation (source: vision `§4`, `§5`, `§15.3`, `§16`).

## 📅 Period

- Start: 2026-05-30
- End: 2026-06-13

## ✅ Tasks (3–8 max)

- [x] **[US-013]** Construire le wizard d'onboarding en 5 étapes
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [x] Les 5 étapes décrites par la vision sont présentes
    - [x] Le récapitulatif final permet validation et reprise
    - [x] Le flux est utilisable en mobile-first
  - Source: vision `§4`, `§16`
- [x] **[US-014]** Modéliser et éditer le profil de base unique
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [x] Le profil de base contient les sections décrites par la vision
    - [x] Les actions de consultation et édition sont disponibles
    - [x] La règle "1 profil de base en MVP" est respectée
  - Source: vision `§5`, `§16`
- [x] **[US-015]** Appliquer les règles de pseudonymisation pour les prompts IA
  - Agent: `tech-lead`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [x] Les données interdites ne sont pas transmises à l'IA
    - [x] Les champs à réinjecter localement sont identifiés
    - [x] Le comportement est couvert par des tests
  - Source: vision `§15.3`, `§16`
- [x] **[US-016]** Ajouter consentement et garde-fous de données nécessaires au MVP
  - Agent: `qa-reviewer`
  - Workflow: `bug-triage`
  - Acceptance criteria:
    - [x] Le consentement utilisateur est collecté à l'inscription
    - [x] Les validations d'entrées critiques sont en place
    - [x] Les écarts RGPD ouverts sont documentés pour le sprint 009
  - Source: vision `§15.1`, `§15.5`

## 📊 Sprint DoD

- [x] All tasks ticked
- [x] All acceptance criteria verified
- [x] `run-tests` green
- [x] Coverage ≥ spec threshold
- [x] QA review ✅

## 🚧 Risks

- La modélisation du profil de base influence directement CV, LM et candidatures.
- Les règles de pseudonymisation doivent être décidées avant l'intégration OpenRouter.

## ⚠️ To Clarify (sprint blockers)

- Aucun bloqueur supplémentaire si le périmètre reste limité au profil unique MVP.
