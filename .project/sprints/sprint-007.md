<!-- generated-by: run-agent analyst -->

# Sprint 007

## 🎯 Sprint Goal

Rendre la génération documentaire du MVP réellement exploitable: CV généré, éditable, exportable et lettre de motivation alignée (source: vision `§6`, `§8`, `§9`, `§15.4`, `§16`).

## 📅 Period

- Start: 2026-07-11
- End: 2026-07-25

## ✅ Tasks (3–8 max)

- [x] **[US-025]** Générer un CV via pipeline OpenRouter vers JSON pseudonymisé puis injection locale
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [x] Le prompt n'expose pas les données interdites
    - [x] Le JSON généré est compatible avec le template actif
    - [x] Les champs réinjectés localement apparaissent au rendu final
  - Source: vision `§6.2`, `§8`, `§15.3`, `§16`
- [x] **[US-026]** Permettre l'édition WYSIWYG Puck côté user + lecture mobile
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [x] L'utilisateur peut éditer son CV dans Puck
    - [x] Un mode lecture seule mobile existe
    - [x] Les modifications restent compatibles avec l'export PDF
  - Source: vision `§6`, `§8`, `§16`
- [ ] **[US-027]** Exporter le CV en PDF via Puppeteer sans métadonnées identifiantes
  - Agent: `tech-lead`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] L'export PDF est généré par le service dédié
    - [ ] Le rendu est fidèle au template Puck
    - [ ] Les métadonnées identifiantes sont supprimées
  - Source: vision `§8`, `§15.4`, `§16`
- [ ] **[US-028]** Générer la lettre de motivation avec le même pipeline documentaire
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] La LM est générée à partir des mêmes sources métier
    - [ ] Le template LM ATS est utilisable par défaut
    - [ ] Le pipeline de pseudonymisation reste cohérent avec celui du CV
  - Source: vision `§9`, `§16`

## 📊 Sprint DoD

- [ ] All tasks ticked
- [ ] All acceptance criteria verified
- [ ] `run-tests` green
- [ ] Coverage ≥ spec threshold
- [ ] QA review ✅

## 🚧 Risks

- Le couplage entre données générées, structure Puck et export PDF peut produire des régressions de rendu.
- La conformité RGPD doit être vérifiée sur chaque étape du pipeline.

## ⚠️ To Clarify (sprint blockers)

- Aucun bloqueur supplémentaire si les templates ATS sont stables en entrée.
