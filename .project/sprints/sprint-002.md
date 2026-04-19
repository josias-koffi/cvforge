<!-- generated-by: run-agent analyst -->

# Sprint 002

## 🎯 Sprint Goal

Fermer les fondations d'interface et de déploiement du MVP avec le design system "Papier & Crayon", le shell responsive et l'override Docker production (source: vision `§2.5`, `§2.6`, `§2.7`, `§16`).

## 📅 Period

- Start: 2026-05-02
- End: 2026-05-16

## ✅ Tasks (3–8 max)

- [x] **[US-005]** Finaliser `docker-compose.prod.yml` avec reverse proxy Traefik + SSL
  - Agent: `tech-lead`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [x] `docker-compose.prod.yml` documente le reverse proxy et le chiffrement SSL
    - [x] Les services `app`, `landing` et `api` sont routables en production
    - [x] Les variables d'environnement prod sont documentées
  - Source: vision `§2.7`, `§16`
- [ ] **[US-006]** Définir les tokens design system "Papier & Crayon"
  - Agent: `designer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] Palette, typographies et tokens d'espacement sont codifiés
    - [ ] Les styles respectent l'esthétique "papier ivoire / trait de crayon"
    - [ ] Les composants de base respectent les contraintes mobile-first
  - Source: vision `§2.5`, `§2.6`, `§16`
- [ ] **[US-007]** Installer `shadcn/ui` et personnaliser les composants de base
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] Les composants de base du design system sont disponibles dans `packages/ui`
    - [ ] Les composants utilisent les tokens "Papier & Crayon"
    - [ ] Les patterns restent conformes à l'accessibilité du spec
  - Source: vision `§2`, `§2.6`, `§16`
- [ ] **[US-008]** Mettre en place la navigation mobile + sidebar desktop
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] Une bottom bar mobile existe pour les sections principales
    - [ ] Une sidebar desktop existe à partir du breakpoint `lg`
    - [ ] Le shell supporte `app`, `landing` et les futurs écrans authentifiés
  - Source: vision `§2.5`, `§16`

## 📊 Sprint DoD

- [ ] All tasks ticked
- [ ] All acceptance criteria verified
- [ ] `run-tests` green
- [ ] Coverage ≥ spec threshold
- [ ] QA review ✅

## 🚧 Risks

- Le design system peut dériver si les tokens ne sont pas centralisés dès ce sprint.
- La configuration Traefik/SSL doit rester cohérente avec la stratégie Docker monorepo.

## ⚠️ To Clarify (sprint blockers)

- Aucun bloqueur de vision supplémentaire; seul le provider email reste hors de ce sprint.
