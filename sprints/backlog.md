<!-- generated-by: /init-project -->

# Product Backlog

> Source of truth: .project/vision.md

## Epics

- [ ] **E1** — Initialiser le monorepo `pnpm` + `turbo` avec `apps/app`, `apps/landing`, `apps/api` et `packages` partagés (source: vision §2.7, vision §16)
      KPI: les commandes racine `pnpm lint`, `pnpm build`, `pnpm test` et `pnpm dev` sont définies, et les 3 apps + 3 packages existent dans l'arborescence (source: vision §2.7, vision §16)
- [ ] **E2** — Poser la baseline d'environnement local Docker pour `app`, `landing`, `api`, `postgres`, `minio`, `puppeteer` et `redis` (source: vision §2.7, vision §16)
      KPI: `docker-compose.yml` référence les 7 services attendus et `.env.example` documente les variables d'environnement critiques (source: vision §2.7)

## User Stories

| ID     | Story                                                                                                                                                          | Epic | Est. | Priority | Source                             |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ---- | -------- | ---------------------------------- |
| US-001 | En tant qu'équipe produit, je veux initialiser le workspace `pnpm`/`turbo` pour standardiser les commandes de développement du monorepo                        | E1   | M    | P0       | vision §2.7, vision §16            |
| US-002 | En tant qu'équipe technique, je veux scaffold `apps/app`, `apps/landing` et `apps/api` pour matérialiser l'architecture Next.js + NestJS définie par la vision | E1   | M    | P0       | vision §2, vision §2.7, vision §16 |
| US-003 | En tant qu'équipe technique, je veux des packages partagés `ui`, `types` et `config` pour centraliser les dépendances transverses du monorepo                  | E1   | S    | P1       | vision §2.7, vision §16            |
| US-004 | En tant qu'équipe plateforme, je veux une baseline Docker locale et un `.env.example` pour préparer les services d'intégration du MVP                          | E2   | M    | P0       | vision §2.7, vision §16            |

## ⚠️ To Clarify

- Aucun blocage de commande restant après initialisation du monorepo. Les prochains points ouverts concernent l'implémentation métier, pas la structure de base (source: vision §16).
