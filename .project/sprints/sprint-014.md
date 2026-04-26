<!-- generated-by: run-agent analyst -->

# Sprint 014

## 🎯 Sprint Goal

Transformer la base technique interview en expérience produit complète, scorée et conforme RGPD (source: vision `§10`, `§15.5`, `§16`).

## 📅 Period

- Start: 2026-10-17
- End: 2026-10-31

## ✅ Tasks (3–8 max)

- [x] **[US-048]** Livrer le mode interview vocal complet avec profils recruteur
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [x] Le mode interview vocal fonctionne de bout en bout
    - [x] Les profils `Standard`, `Agressif`, `Passif`, `Technique`, `Comportemental` existent
    - [x] L'utilisateur peut lancer et terminer proprement une session
  - Source: vision `§10`, `§16`
- [ ] **[US-049]** Générer le rapport post-interview avec métriques et notes
  - Agent: `analyst`
  - Workflow: `release`
  - Acceptance criteria:
    - [ ] Un rapport structuré est généré en fin de session
    - [ ] Les notes et métriques sont persistées
    - [ ] Le dashboard peut consommer ces scores
  - Source: vision `§10`, `§12.3`, `§16`
- [ ] **[US-050]** Ajouter réécoute audio, transcription, mode pratique libre, purge RGPD et pré-génération
  - Agent: `tech-lead`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] La réécoute audio et la transcription sont disponibles
    - [ ] Le mode pratique libre fonctionne
    - [ ] La purge automatique audio respecte la politique RGPD
    - [ ] La pré-génération de la question suivante est intégrée si la latence le permet
  - Source: vision `§10`, `§15.5`, `§16`

## 📊 Sprint DoD

- [ ] All tasks ticked
- [ ] All acceptance criteria verified
- [ ] `run-tests` green
- [ ] Coverage ≥ spec threshold
- [ ] QA review ✅

## 🚧 Risks

- La gestion des fichiers audio peut créer de la dette d'infrastructure et de conformité.
- Le mode pratique libre peut nécessiter un cadrage UX plus fin.

## ⚠️ To Clarify (sprint blockers)

- Fixer la durée de rétention audio et son automatisation avant clôture du sprint.
