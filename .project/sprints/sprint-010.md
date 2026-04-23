<!-- generated-by: run-agent analyst -->

# Sprint 010

## 🎯 Sprint Goal

Finaliser le MVP en livrant le panel admin complet, les opérations avancées de templates, le centre de notifications et les exigences RGPD critiques avant lancement commercial (source: vision `§12.2`, `§13`, `§15.1`, `§15.5`, `§16`).

## 📅 Period

- Start: 2026-08-22
- End: 2026-09-05

## ✅ Tasks (3–8 max)

- [x] **[US-033]** Développer le panel admin utilisateurs et crédits
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [x] La liste des utilisateurs est paginée et filtrable
    - [x] Les crédits peuvent être attribués manuellement avec note obligatoire
    - [x] Chaque attribution manuelle est loggée
  - Source: vision `§13.2`, `§16`
- [x] **[US-034]** Finaliser les opérations avancées de gestion des templates admin
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [x] Les analytics de templates (top templates, volume) sont visibles
    - [x] L'export CSV des données admin est disponible
    - [x] Les opérations restantes du panel admin sont complètes
  - Source: vision `§13.3`, `§16`
- [x] **[US-035]** Mettre en place le centre de notifications et les rappels de base
  - Agent: `designer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [x] La cloche avec badge est présente dans le header
    - [x] Les notifications in-app sont listées avec statut lu/non lu
    - [x] Les rappels de candidature (J+7) sont déclenchés
  - Source: vision `§12.4`, `§14`, `§16`
- [x] **[US-036]** Traiter les exigences RGPD critiques avant lancement commercial
  - Agent: `tech-lead`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [x] Export des données personnelles disponible
    - [x] Suppression compte + données associées opérationnelle
    - [x] Durées de conservation documentées et purge automatique audio prévue
  - Source: vision `§15.1`, `§15.5`, `§16`

## 📊 Sprint DoD

- [x] All tasks ticked
- [x] All acceptance criteria verified
- [x] `run-tests` green
- [x] Coverage ≥ spec threshold
- [x] QA review ✅

## 🚧 Risks

- La suppression RGPD doit être irréversible — prévoir une confirmation forte côté admin.
- Les durées de conservation audio doivent être définies avant d'implémenter la purge.

## ⚠️ To Clarify (sprint blockers)

- Aucun blocage restant pour le sprint `010` ; la purge audio est maintenant planifiée pour le scope interview.
