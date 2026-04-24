<!-- generated-by: run-agent analyst -->

# Sprint 011

## 🎯 Sprint Goal

Ouvrir `V1.1` avec les fonctions de productivité candidat: profils multiples, import CV, export DOCX, historique et recherche de recruteur (source: vision `§4`, `§5`, `§6.6`, `§16`).

## 📅 Period

- Start: 2026-09-05
- End: 2026-09-19

## ✅ Tasks (3–8 max)

- [x] **[US-037]** Ajouter les profils de base multiples
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [x] Un utilisateur peut gérer plusieurs profils de base
    - [x] Le profil actif peut être sélectionné par candidature
    - [x] La compatibilité avec CV/LM existants est maintenue
  - Source: vision `§5.1`, `§16`
- [x] **[US-038]** Importer un CV existant avec extraction IA pseudonymisée
  - Agent: `tech-lead`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [x] L'import de CV est disponible
    - [x] Le pipeline d'extraction respecte la pseudonymisation
    - [x] Les limites de qualité sont documentées
  - Source: vision `§4`, `§15.3`, `§16`
- [x] **[US-039]** Ajouter l'export DOCX et l'historique des versions CV/LM
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [x] Un export DOCX existe
    - [x] Les versions successives des CV/LM sont historisées
    - [x] Le choix de la librairie DOCX est documenté par ADR si nécessaire
  - Source: vision `§6.6`, `§16`
- [x] **[US-040]** Ajouter la recherche de recruteur
  - Agent: `analyst`
  - Workflow: `spike-research`
  - Acceptance criteria:
    - [x] Le cas d'usage est implémenté ou cadré précisément
    - [x] Les sources et limitations des données sont documentées
    - [x] Le flux s'intègre au parcours candidature
  - Source: vision `§16`

## 📊 Sprint DoD

- [x] All tasks ticked
- [x] All acceptance criteria verified
- [ ] `run-tests` green
- [ ] Coverage ≥ spec threshold
- [ ] QA review ✅

## 🚧 Risks

- L'import CV peut être bruité et coûteux.
- Le choix de la librairie DOCX peut déclencher une ADR.

## ⚠️ To Clarify (sprint blockers)

- Confirmer la librairie DOCX retenue pendant le sprint.
