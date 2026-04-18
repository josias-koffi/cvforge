<!-- generated-by: /init-project -->
<!-- vars: TODAY_ISO, TODAY_PLUS_14 -->

# Sprint 001

## 🎯 Sprint Goal

Initialiser le monorepo et rendre l'environnement de développement exécutable et documenté (source: vision §2.7, vision §16).

## 📅 Period

- Start: 2026-04-18
- End: 2026-05-02

## ✅ Tasks (3–8 max)

- [x] **[US-001]** Initialiser le workspace `pnpm`/`turbo` à la racine du dépôt
  - Agent: `analyst`
  - Workflow: `spike-research`
  - Acceptance criteria:
    - [ ] `package.json`, `pnpm-workspace.yaml` et `turbo.json` existent
    - [ ] Les commandes racine `pnpm lint`, `pnpm format`, `pnpm test`, `pnpm build`, `pnpm dev` et `pnpm audit` sont définies
    - [ ] `.project/state.json` n'a plus de clarifications liées aux commandes du repo
  - Source: vision §2.7, vision §16
- [x] **[US-002]** Scaffold les apps `app`, `landing` et `api` conformément à l'architecture cible
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] `apps/app` et `apps/landing` contiennent une structure Next.js minimale
    - [ ] `apps/api` contient une structure NestJS minimale
    - [ ] Les packages d'app exposent chacun des scripts `dev`, `build`, `lint` et `test`
  - Source: vision §2, vision §2.7, vision §16
- [x] **[US-003]** Créer les packages partagés `ui`, `types` et `config`
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] `packages/ui`, `packages/types` et `packages/config` existent
    - [ ] Le package `config` centralise une base TypeScript/ESLint commune
    - [ ] Les apps dépendent d'au moins un package partagé du monorepo
  - Source: vision §2.7, vision §16
- [x] **[US-004]** Poser la baseline Docker locale et la documentation d'environnement
  - Agent: `tech-lead`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] `docker-compose.yml` décrit `app`, `landing`, `api`, `postgres`, `minio`, `puppeteer` et `redis`
    - [ ] `docker-compose.prod.yml` et `.env.example` existent
    - [ ] Les Dockerfiles `app`, `landing`, `api` et `puppeteer` existent sous `docker/`
  - Source: vision §2.7, vision §16

## 📊 Sprint DoD

- [ ] All tasks ticked
- [ ] All acceptance criteria verified
- [ ] `run-tests` green
- [ ] Coverage ≥ spec threshold
- [ ] QA review ✅

## 🚧 Risks

- Les dépendances ne sont pas encore installées, donc les commandes déclarées ne sont pas encore vérifiées en exécution réelle.
- Le design system "Papier & Crayon" reste à détailler avant d'industrialiser `packages/ui` (source: vision §16).

## ⚠️ To Clarify (sprint blockers)

- Aucun bloqueur structurel restant pour les commandes du repo; la prochaine clarification porte sur l'implémentation détaillée du design system et des workflows CI (source: vision §16).
