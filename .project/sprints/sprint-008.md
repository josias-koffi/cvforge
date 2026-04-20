<!-- generated-by: run-agent tech-lead -->

# Sprint 008

## 🎯 Sprint Goal

Intégrer Puck Editor à tous les endroits où il est attendu par la vision : installation et configuration, interface admin drag-and-drop, et éditeur CV utilisateur — conformément à ADR-003 (source: vision `§6.1`, `§6.7`, `§8`, `§13.3`, `§16`).

## 📅 Period

- Start: 2026-07-25
- End: 2026-08-08

## ✅ Tasks (3–8 max)

- [ ] **[US-055]** Installer `@measured-co/puck`, créer l'adaptateur `toPuckConfig()` et migrer le JSON des templates existants
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] `@measured-co/puck` est installé dans `packages/ui`
    - [ ] `toPuckConfig(registry, kind)` produit un `Config` Puck valide filtré par `templateKind`
    - [ ] Le type `TemplateRecord.layout` est mis à jour vers le type `Data` de Puck
    - [ ] Un script de migration convertit les templates existants de `{ blocks: [] }` vers `{ content: [], root: { props: {} } }`
    - [ ] Les tests existants liés au registre passent après migration
  - Source: ADR-003, vision `§6.1`, `§6.3`

- [ ] **[US-056]** Intégrer Puck Editor en mode drag-and-drop dans l'interface admin de templates
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] Le textarea JSON est remplacé par un vrai canvas Puck avec la palette de blocs filtrée par `kind`
    - [ ] L'admin peut assembler, réordonner et supprimer des blocs par drag-and-drop
    - [ ] `onPublish` appelle `PUT /templates/:id` et met à jour le layout en base
    - [ ] Le composant `<PuckTemplateEditor>` est chargé via `next/dynamic` avec `ssr: false`
    - [ ] La création d'un nouveau template ouvre un canvas vide dans Puck
  - Source: ADR-003, vision `§6.1`, `§6.7`, `§13.3`

- [ ] **[US-057]** Remplacer l'éditeur de CV utilisateur par Puck Editor en mode contenu uniquement
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] Le formulaire shadcn/ui est remplacé par `<Puck>` avec `permissions: { delete: false, drag: false, duplicate: false, insert: false }`
    - [ ] Le contenu généré par l'IA est chargé dans Puck comme `Data` initial
    - [ ] Les modifications sont sauvegardées via `PUT /applications/:id/cv`
    - [ ] La lecture mobile utilise `<Render>` de Puck (SSR-safe, pas d'import dynamique nécessaire)
    - [ ] L'export PDF via Puppeteer reste compatible avec le rendu `<Render>`
  - Source: ADR-003, vision `§6`, `§8`, `§16`

## 📊 Sprint DoD

- [ ] All tasks ticked
- [ ] All acceptance criteria verified
- [ ] `run-tests` green
- [ ] Coverage ≥ spec threshold
- [ ] QA review ✅

## 🚧 Risks

- La migration JSON des templates existants (seed + éventuellement base de données) doit être exécutée avant le déploiement de US-056 et US-057 — le format `{ blocks: [] }` sera rejeté par Puck.
- `<Puck>` ne supporte pas le SSR : tout composant qui l'importe directement cassera le build Next.js si `"use client"` ou `next/dynamic` avec `ssr: false` est oublié.
- Les permissions Puck (`drag: false` etc.) sont côté client uniquement — le backend doit continuer à valider la structure du layout JSON reçu.

## ⚠️ To Clarify (sprint blockers)

- Confirmer que la version stable actuelle de `@measured-co/puck` est compatible avec React 18 et Next.js 14+ avant de lancer US-055.
